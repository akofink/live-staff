import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  AudioCaptureError,
  MicrophoneCapture,
  type AudioCaptureLifecycleEvent,
  type AudioCaptureSession,
} from "../audio/microphone";
import { detectPitch } from "../audio/detectors/autocorrelation";
import { InputFilterChain, type InputFilterBand } from "../audio/inputFilterChain";
import { frequencyToNote, type DetectedNote } from "../pitch/note";
import { NoteStabilizer } from "../pitch/stabilizer";
import { GrandStaff } from "../components/GrandStaff";
import { toDisplayPitch } from "../instruments/displayPitch";
import { instruments } from "../instruments/instruments";
import { getBrowserStorage, loadPreferences, savePreferences } from "../preferences/browserStorage";
import { instrumentOptions, type Preferences } from "../preferences/preferences";
import { PitchHistory, pitchHistoryWindowMs, type PitchHistoryEvent } from "../pitch/pitchHistory";
import type { SignalMonitorHandle } from "../components/SignalMonitor";
import { isLowPowerSignalMonitor } from "../audio/signalMonitor";
import { RoomNoiseGate } from "../audio/roomNoiseGate";
import { InputFilters } from "../components/InputFilters";

type ListeningState = "idle" | "starting" | "listening" | "interrupted" | "error";

const SignalMonitor = lazy(async () => {
  const module = await import("../components/SignalMonitor");
  return { default: module.SignalMonitor };
});

export function App() {
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(getBrowserStorage()));
  const capture = useRef<MicrophoneCapture | undefined>(undefined);
  const session = useRef<AudioCaptureSession | undefined>(undefined);
  const stabilizer = useRef(new NoteStabilizer());
  const inputFilterChain = useRef(new InputFilterChain());
  const roomNoiseGate = useRef(new RoomNoiseGate());
  const inputFilters = useRef(preferences.inputFilters);
  const filtersBypassed = useRef(false);
  const lastDetection = useRef(0);
  const pitchHistory = useRef(new PitchHistory());
  const historyExpiry = useRef<number | undefined>(undefined);
  const signalMonitor = useRef<SignalMonitorHandle>(null);
  const signalMonitorEnabledRef = useRef(false);
  const roomCalibrationStateRef = useRef<"idle" | "calibrating" | "active">("idle");
  const listeningStateRef = useRef<ListeningState>("idle");
  const operation = useRef(0);
  const [listeningState, setListeningState] = useState<ListeningState>("idle");
  const [message, setMessage] = useState("Ready to listen locally.");
  const [note, setNote] = useState<DetectedNote | undefined>(undefined);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [historyEvents, setHistoryEvents] = useState<ReturnType<PitchHistory["snapshot"]>>([]);
  const [historyNowMs, setHistoryNowMs] = useState(0);
  const [signalMonitorEnabled, setSignalMonitorEnabled] = useState(false);
  const [roomCalibrationState, setRoomCalibrationState] = useState<"idle" | "calibrating" | "active">("idle");
  const [filterBypass, setFilterBypass] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && listeningStateRef.current === "listening") {
        session.current?.pause("background");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      operation.current += 1;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearTimeout(historyExpiry.current);
      session.current?.setSignalMonitor(undefined);
      void capture.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (historyEvents.length === 0) return;
    const interval = window.setInterval(() => setHistoryNowMs(performance.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [historyEvents.length]);

  function scheduleHistoryExpiry(events: readonly PitchHistoryEvent[], timestamp: number) {
    window.clearTimeout(historyExpiry.current);
    const nextEnd = events.reduce<number | undefined>(
      (earliest, event) => event.endMs !== undefined && (earliest === undefined || event.endMs < earliest)
        ? event.endMs
        : earliest,
      undefined,
    );
    if (nextEnd === undefined) {
      return;
    }

    historyExpiry.current = window.setTimeout(() => {
      const now = performance.now();
      const expiredHistory = pitchHistory.current.update(undefined, now);
      const remainingHistory = expiredHistory ?? pitchHistory.current.snapshot();
      if (expiredHistory) {
        setHistoryEvents(expiredHistory);
        setHistoryNowMs(now);
      }
      scheduleHistoryExpiry(remainingHistory, now);
    }, Math.max(0, nextEnd + pitchHistoryWindowMs - timestamp + 1));
  }

  function transition(state: ListeningState, nextMessage: string) {
    listeningStateRef.current = state;
    setListeningState(state);
    setMessage(nextMessage);
  }

  function resetSessionTransients() {
    session.current?.setSignalMonitor(undefined);
    stabilizer.current.reset();
    inputFilterChain.current.reset();
    roomNoiseGate.current.reset();
    roomCalibrationStateRef.current = "idle";
    setRoomCalibrationState("idle");
    lastDetection.current = 0;
    const timestamp = performance.now();
    const nextHistory = pitchHistory.current.update(undefined, timestamp);
    if (nextHistory) {
      setHistoryEvents(nextHistory);
      setHistoryNowMs(timestamp);
    }
    scheduleHistoryExpiry(nextHistory ?? pitchHistory.current.snapshot(), timestamp);
    setNote(undefined);
  }

  function handleLifecycle(event: AudioCaptureLifecycleEvent) {
    if (event.state === "running") {
      if (listeningStateRef.current === "interrupted" && session.current) {
        if (signalMonitorEnabledRef.current) {
          session.current.setSignalMonitor(
            (frame) => signalMonitor.current?.draw(frame),
            isLowPowerSignalMonitor(),
          );
        }
        transition("listening", `Listening locally at ${session.current.sampleRate} Hz.`);
      }
      return;
    }
    resetSessionTransients();
    if (event.state === "suspended") {
      const reason = event.reason === "route-change"
        ? "The microphone route changed. Resume listening to continue."
        : event.reason === "background"
          ? "Listening paused while the page was in the background. Resume listening to continue."
          : "Microphone audio was suspended. Resume listening to continue.";
      transition("interrupted", reason);
      return;
    }

    session.current = undefined;
    transition(
      "error",
      event.state === "failed"
        ? event.error.message
        : event.reason === "device-lost"
          ? "The microphone disconnected. Connect it and try again."
          : "The microphone audio session ended. Try again.",
    );
  }

  async function toggleListening() {
    if (listeningStateRef.current === "starting") {
      operation.current += 1;
      await capture.current?.stop();
      resetSessionTransients();
      transition("idle", "Microphone startup canceled. No audio session is active.");
      return;
    }

    if (listeningStateRef.current === "interrupted" && session.current) {
      try {
        await session.current.resume();
        if (signalMonitorEnabledRef.current) {
          session.current.setSignalMonitor(
            (frame) => signalMonitor.current?.draw(frame),
            isLowPowerSignalMonitor(),
          );
        }
        window.clearTimeout(historyExpiry.current);
        transition("listening", `Listening locally at ${session.current.sampleRate} Hz.`);
      } catch (error) {
        await capture.current?.stop();
        session.current = undefined;
        transition("error", error instanceof AudioCaptureError ? error.message : "Microphone audio could not resume. Try again.");
      }
      return;
    }

    if (session.current) {
      operation.current += 1;
      const activeSession = session.current;
      session.current = undefined;
      resetSessionTransients();
      await activeSession.stop();
      transition("idle", "Listening stopped. Microphone resources were released.");
      return;
    }

    const currentOperation = ++operation.current;
    transition("starting", "Requesting microphone access...");
    inputFilterChain.current.reset();
    inputFilterChain.current.configure(inputFilters.current, filtersBypassed.current);

    try {
      capture.current ??= new MicrophoneCapture();
      const startedSession = await capture.current.start((frame) => {
        const timestamp = performance.now();
        if (timestamp - lastDetection.current < 80) {
          return;
        }
        lastDetection.current = timestamp;

        const sampleRate = session.current?.sampleRate ?? 44_100;
        const filteredFrame = inputFilterChain.current.process(frame, sampleRate);
        const estimate = roomNoiseGate.current.process(
          filteredFrame,
          roomNoiseGate.current.state === "calibrating" ? null : detectPitch(filteredFrame, sampleRate),
        );
        if (roomCalibrationStateRef.current === "calibrating" && roomNoiseGate.current.state !== "calibrating") {
          const calibrationState = roomNoiseGate.current.state === "active" ? "active" : "idle";
          roomCalibrationStateRef.current = calibrationState;
          setRoomCalibrationState(calibrationState);
          setMessage(calibrationState === "active"
            ? "Room noise calibrated locally for this listening session."
            : "The room is already below the detector noise threshold. Calibration is not needed.");
        }
        const stableNote = stabilizer.current.update(
          estimate ? frequencyToNote(estimate.frequencyHz) : null,
        );
        const nextHistory = pitchHistory.current.update(stableNote?.midi, timestamp);
        if (nextHistory) {
          setHistoryEvents(nextHistory);
          setHistoryNowMs(timestamp);
        }
        setNote(stableNote ?? undefined);
      }, (event) => {
        if (currentOperation === operation.current) handleLifecycle(event);
      });
      if (currentOperation !== operation.current) {
        await startedSession.stop();
        return;
      }
      session.current = startedSession;
      if (signalMonitorEnabledRef.current) {
        session.current.setSignalMonitor(
          (frame) => signalMonitor.current?.draw(frame),
          isLowPowerSignalMonitor(),
        );
      }
      window.clearTimeout(historyExpiry.current);
      transition("listening", `Listening locally at ${session.current.sampleRate} Hz.`);
    } catch (error) {
      if (currentOperation !== operation.current || (error instanceof AudioCaptureError && error.code === "start-canceled")) return;
      resetSessionTransients();
      transition(
        "error",
        error instanceof AudioCaptureError
          ? error.message
          : "Live Staff could not start listening.",
      );
    }
  }

  function toggleSignalMonitor(enabled: boolean) {
    signalMonitorEnabledRef.current = enabled;
    if (enabled) {
      session.current?.setSignalMonitor(
        (frame) => signalMonitor.current?.draw(frame),
        isLowPowerSignalMonitor(),
      );
    } else {
      session.current?.setSignalMonitor(undefined);
    }
    setSignalMonitorEnabled(enabled);
  }

  function updatePreferences(update: Partial<Preferences>) {
    const nextPreferences = { ...preferences, ...update };
    setPreferences(nextPreferences);
    inputFilters.current = nextPreferences.inputFilters;
    inputFilterChain.current.configure(nextPreferences.inputFilters, filtersBypassed.current);
    setPreferencesMessage(
      savePreferences(getBrowserStorage(), nextPreferences)
        ? "Preference saved on this device."
        : "This browser cannot save preferences. Your choice will apply until you reload.",
    );
  }

  const selectedInstrumentOption = instrumentOptions.find(
    (instrument) => instrument.id === preferences.instrumentId,
  )!;
  const selectedInstrument = instruments.find(
    (instrument) => instrument.id === selectedInstrumentOption.definitionId,
  )!;
  const primaryPitchDisplay = selectedInstrument.writtenToConcertSemitones === 0 ? "concert" : "written";
  const displayPitch = note && toDisplayPitch(note.midi, primaryPitchDisplay, selectedInstrument);
  const concertPitch = note && toDisplayPitch(note.midi, "concert", selectedInstrument);
  const pitchLabel = primaryPitchDisplay === "concert"
    ? "Concert pitch"
    : `Written pitch for ${selectedInstrument.name}`;

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <header className="app-header">
          <div>
            <p className="eyebrow">Live notation, not another tuner</p>
            <h1 id="app-title">Live Staff</h1>
          </div>
          <p className="lede">Play a note. See it appear on the staff.</p>
        </header>
        <section className="listening-control" aria-label="Listening control">
          <p className="signal-label">Input</p>
          <button
            type="button"
            onClick={() => void toggleListening()}
            aria-describedby="listening-status"
          >
            <span className="listen-indicator" aria-hidden="true" />
            {listeningState === "starting"
              ? "Cancel starting"
              : listeningState === "listening"
                ? "Stop listening"
                : listeningState === "interrupted"
                  ? "Resume listening"
                  : "Start listening"}
          </button>
          <p
            id="listening-status"
            className="status"
            role="status"
            aria-live="polite"
            data-state={listeningState}
          >
            {message}
          </p>
        </section>
        <div className="live-workspace">
          <GrandStaff
            midi={displayPitch?.midi}
            noteName={displayPitch?.name}
            accidentalPreference={primaryPitchDisplay === "written" ? selectedInstrument.accidentalPreference ?? "sharp" : "sharp"}
            pitchLabel={pitchLabel}
            loadRenderer
            historyEvents={historyEvents}
            historyNowMs={historyNowMs}
            instrument={selectedInstrument}
            pitchDisplay={primaryPitchDisplay}
          />
          <section className="note-display" aria-label="Detected pitch">
            <p className="note-name">{displayPitch?.name ?? "--"}</p>
            <p className="note-kind">
              {pitchLabel}
            </p>
            <dl className="note-details">
              <div>
                <dt>Frequency</dt>
                <dd>{note ? `${note.frequencyHz.toFixed(1)} Hz` : "Waiting"}</dd>
              </div>
              <div>
                <dt>Pitch center</dt>
                <dd>{note ? `${note.cents >= 0 ? "+" : ""}${note.cents} cents` : "--"}</dd>
              </div>
            </dl>
            {primaryPitchDisplay === "written" && concertPitch && (
              <details className="pitch-reference">
                <summary>Pitch reference</summary>
                <p>Sounding concert pitch: {concertPitch.name}</p>
              </details>
            )}
          </section>
        </div>
        <details className="preferences">
          <summary>
            <span>
              <span className="signal-label">Setup</span>
              <span className="settings-title">Instrument and input settings</span>
            </span>
            <span className="settings-summary">{selectedInstrumentOption.label}</span>
          </summary>
          <div className="preferences-panel">
            <label>
              Instrument
              <select
                id="instrument"
                value={preferences.instrumentId}
                aria-describedby="instrument-guidance"
                onChange={(event) => updatePreferences({ instrumentId: event.target.value as Preferences["instrumentId"] })}
              >
                {instrumentOptions.map((instrument) => (
                  <option key={instrument.id} value={instrument.id}>
                    {instrument.label}
                  </option>
                ))}
              </select>
            </label>
            <p id="instrument-guidance" className="preferences-help" role="status" aria-live="polite">
              Concert instruments show concert notation. Transposing instruments show their written notation. Changes apply immediately.
            </p>
            <InputFilters bands={preferences.inputFilters} bypassed={filterBypass} onBypass={(bypassed) => {
              filtersBypassed.current = bypassed;
              setFilterBypass(bypassed);
              inputFilterChain.current.configure(inputFilters.current, bypassed);
              roomNoiseGate.current.reset();
              stabilizer.current.reset();
              roomCalibrationStateRef.current = "idle";
              setRoomCalibrationState("idle");
            }} onChange={(bands: readonly InputFilterBand[]) => {
              inputFilterChain.current.reset();
              roomNoiseGate.current.reset();
              stabilizer.current.reset();
              roomCalibrationStateRef.current = "idle";
              setRoomCalibrationState("idle");
              updatePreferences({ inputFilters: bands });
            }} />
            <button
              type="button"
              disabled={listeningState !== "listening" || roomCalibrationState === "calibrating"}
              onClick={() => {
                roomNoiseGate.current.startCalibration();
                stabilizer.current.reset();
                setNote(undefined);
                roomCalibrationStateRef.current = "calibrating";
                setRoomCalibrationState("calibrating");
                setMessage("Calibrating room noise. Stay quiet for about one second.");
              }}
            >
              {roomCalibrationState === "calibrating" ? "Calibrating room noise..." : "Calibrate room noise"}
            </button>
            <p className="preferences-help">
              Optional and session-only. Stay quiet briefly; louder voice and instrument notes remain detectable.
              {roomCalibrationState === "active" ? " Calibration is active." : ""}
            </p>
            <details className="advanced-settings">
              <summary>Advanced diagnostics</summary>
              <div className="advanced-settings-panel">
                <label className="signal-monitor-toggle">
                  <input
                    type="checkbox"
                    checked={signalMonitorEnabled}
                    aria-describedby="signal-monitor-guidance"
                    onChange={(event) => toggleSignalMonitor(event.target.checked)}
                  />
                  Show waveform and spectrum
                </label>
                <p id="signal-monitor-guidance" className="preferences-help">
                  Runs locally only while enabled and listening. Turn it off to stop diagnostic analysis immediately.
                </p>
                {signalMonitorEnabled && (
                  listeningState === "listening"
                    ? (
                        <Suspense fallback={<p className="signal-monitor-empty">Preparing local diagnostics...</p>}>
                          <SignalMonitor ref={signalMonitor} bands={preferences.inputFilters} bypassed={filterBypass} />
                        </Suspense>
                      )
                    : <p className="signal-monitor-empty" role="status">Start listening to inspect the microphone signal.</p>
                )}
              </div>
            </details>
            <p className="preferences-status" role="status" aria-live="polite">
              {preferencesMessage}
            </p>
          </div>
        </details>
      </section>
      <aside className="privacy-note">
        <h2>Private by design</h2>
        <p>
          Microphone audio is analyzed in your browser. It is not uploaded,
          recorded, or sent to a server.
        </p>
      </aside>
    </main>
  );
}
