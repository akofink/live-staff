import { useEffect, useRef, useState } from "react";
import { AudioCaptureError, MicrophoneCapture, type AudioCaptureSession } from "../audio/microphone";
import { detectPitch } from "../audio/detectors/autocorrelation";
import { MainsHumFilter } from "../audio/mainsHumFilter";
import { frequencyToNote, type DetectedNote } from "../pitch/note";
import { NoteStabilizer } from "../pitch/stabilizer";
import { GrandStaff } from "../components/GrandStaff";
import { toDisplayPitch } from "../instruments/displayPitch";
import { instruments } from "../instruments/instruments";
import { getBrowserStorage, loadPreferences, savePreferences } from "../preferences/browserStorage";
import { instrumentOptions, type Preferences } from "../preferences/preferences";
import { PitchHistory, pitchHistoryWindowMs, type PitchHistoryEvent } from "../pitch/pitchHistory";
import { PitchHistoryStrip } from "../components/PitchHistoryStrip";

type ListeningState = "idle" | "starting" | "listening" | "error";

export function App() {
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(getBrowserStorage()));
  const capture = useRef<MicrophoneCapture | undefined>(undefined);
  const session = useRef<AudioCaptureSession | undefined>(undefined);
  const stabilizer = useRef(new NoteStabilizer());
  const mainsHumFilter = useRef(new MainsHumFilter());
  const mainsHumFrequency = useRef(preferences.mainsHumFrequency);
  const lastDetection = useRef(0);
  const pitchHistory = useRef(new PitchHistory());
  const historyExpiry = useRef<number | undefined>(undefined);
  const [listeningState, setListeningState] = useState<ListeningState>("idle");
  const [message, setMessage] = useState("Ready to listen locally.");
  const [note, setNote] = useState<DetectedNote | undefined>(undefined);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [historyEvents, setHistoryEvents] = useState<ReturnType<PitchHistory["snapshot"]>>([]);

  useEffect(() => {
    return () => {
      window.clearTimeout(historyExpiry.current);
      void session.current?.stop();
    };
  }, []);

  function scheduleHistoryExpiry(events: readonly PitchHistoryEvent[], timestamp: number) {
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
      }
      scheduleHistoryExpiry(remainingHistory, now);
    }, Math.max(0, nextEnd + pitchHistoryWindowMs - timestamp + 1));
  }

  async function toggleListening() {
    if (session.current) {
      await session.current.stop();
      session.current = undefined;
      stabilizer.current.reset();
      mainsHumFilter.current.reset();
      const timestamp = performance.now();
      const nextHistory = pitchHistory.current.update(undefined, timestamp);
      if (nextHistory) {
        setHistoryEvents(nextHistory);
      }
      scheduleHistoryExpiry(nextHistory ?? pitchHistory.current.snapshot(), timestamp);
      setNote(undefined);
      setListeningState("idle");
      setMessage("Listening stopped. Microphone resources were released.");
      return;
    }

    setListeningState("starting");
    setMessage("Requesting microphone access...");
    mainsHumFilter.current.reset();

    try {
      capture.current ??= new MicrophoneCapture();
      session.current = await capture.current.start((frame) => {
        const timestamp = performance.now();
        if (timestamp - lastDetection.current < 80) {
          return;
        }
        lastDetection.current = timestamp;

        const sampleRate = session.current?.sampleRate ?? 44_100;
        mainsHumFilter.current.setFrequency(
          mainsHumFrequency.current === "off" ? undefined : mainsHumFrequency.current,
        );
        const estimate = detectPitch(mainsHumFilter.current.process(frame, sampleRate), sampleRate);
        const stableNote = stabilizer.current.update(
          estimate ? frequencyToNote(estimate.frequencyHz) : null,
        );
        const nextHistory = pitchHistory.current.update(stableNote?.midi, timestamp);
        if (nextHistory) {
          setHistoryEvents(nextHistory);
        }
        setNote(stableNote ?? undefined);
      });
      window.clearTimeout(historyExpiry.current);
      setListeningState("listening");
      setMessage(`Listening locally at ${session.current.sampleRate} Hz.`);
    } catch (error) {
      setListeningState("error");
      setMessage(
        error instanceof AudioCaptureError
          ? error.message
          : "Live Staff could not start listening.",
      );
    }
  }

  function updatePreferences(update: Partial<Preferences>) {
    const nextPreferences = { ...preferences, ...update };
    setPreferences(nextPreferences);
    mainsHumFrequency.current = nextPreferences.mainsHumFrequency;
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
            disabled={listeningState === "starting"}
            aria-describedby="listening-status"
          >
            <span className="listen-indicator" aria-hidden="true" />
            {listeningState === "listening" ? "Stop listening" : "Start listening"}
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
        <PitchHistoryStrip
          events={historyEvents}
          instrument={selectedInstrument}
          pitchDisplay={primaryPitchDisplay}
        />
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
            <label>
              Background hum
              <select
                value={preferences.mainsHumFrequency}
                onChange={(event) =>
                  updatePreferences({
                    mainsHumFrequency:
                      event.target.value === "off" ? "off" : (Number(event.target.value) as 50 | 60),
                  })
                }
              >
                <option value="off">Off</option>
                <option value="50">Suppress 50 Hz</option>
                <option value="60">Suppress 60 Hz</option>
              </select>
            </label>
            <p className="preferences-help">
              Use only when electrical hum masks your note. It removes a narrow local frequency band.
            </p>
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
