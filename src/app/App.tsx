import { useEffect, useRef, useState } from "react";
import { AudioCaptureError, MicrophoneCapture, type AudioCaptureSession } from "../audio/microphone";
import { detectPitch } from "../audio/detectors/autocorrelation";
import { MainsHumFilter } from "../audio/mainsHumFilter";
import { frequencyToNote, type DetectedNote } from "../pitch/note";
import { NoteStabilizer } from "../pitch/stabilizer";
import { TrebleStaff } from "../components/TrebleStaff";
import { getBrowserStorage, loadPreferences, savePreferences } from "../preferences/browserStorage";
import { instrumentOptions, type Preferences } from "../preferences/preferences";

type ListeningState = "idle" | "starting" | "listening" | "error";

export function App() {
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(getBrowserStorage()));
  const capture = useRef<MicrophoneCapture | undefined>(undefined);
  const session = useRef<AudioCaptureSession | undefined>(undefined);
  const stabilizer = useRef(new NoteStabilizer());
  const mainsHumFilter = useRef(new MainsHumFilter());
  const mainsHumFrequency = useRef(preferences.mainsHumFrequency);
  const lastDetection = useRef(0);
  const [listeningState, setListeningState] = useState<ListeningState>("idle");
  const [message, setMessage] = useState("Ready to listen locally.");
  const [note, setNote] = useState<DetectedNote | undefined>(undefined);
  const [preferencesMessage, setPreferencesMessage] = useState("");

  useEffect(() => {
    return () => {
      void session.current?.stop();
    };
  }, []);

  async function toggleListening() {
    if (session.current) {
      await session.current.stop();
      session.current = undefined;
      stabilizer.current.reset();
      mainsHumFilter.current.reset();
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
        setNote(stableNote ?? undefined);
      });
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

  const selectedInstrument = instrumentOptions.find(
    (instrument) => instrument.id === preferences.instrumentId,
  )!;
  const writtenPitchUnavailable = preferences.pitchDisplay === "written" && preferences.instrumentId !== "concert";

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <p className="eyebrow">Live notation, not another tuner</p>
        <h1 id="app-title">Live Staff</h1>
        <p className="lede">
          Play a note. See its concert pitch appear live.
        </p>
        <section className="preferences" aria-labelledby="preferences-heading">
          <h2 id="preferences-heading">Display settings</h2>
          <label>
            Instrument
            <select
              value={preferences.instrumentId}
              onChange={(event) => updatePreferences({ instrumentId: event.target.value as Preferences["instrumentId"] })}
            >
              {instrumentOptions.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>
                  {instrument.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Pitch display</legend>
            <label>
              <input
                type="radio"
                name="pitch-display"
                checked={preferences.pitchDisplay === "concert"}
                onChange={() => updatePreferences({ pitchDisplay: "concert" })}
              />
              Concert pitch
            </label>
            <label>
              <input
                type="radio"
                name="pitch-display"
                checked={preferences.pitchDisplay === "written"}
                onChange={() => updatePreferences({ pitchDisplay: "written" })}
              />
              Written pitch
            </label>
          </fieldset>
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
        </section>
        <TrebleStaff
          midi={note?.midi}
          noteName={note?.name}
          loadRenderer={listeningState !== "idle"}
        />
        <section className="note-display" aria-label="Detected pitch">
          <p className="note-name">{writtenPitchUnavailable ? "--" : note?.name ?? "--"}</p>
          <p className="note-kind">
            {preferences.pitchDisplay === "concert" ? "Concert pitch" : `Written pitch for ${selectedInstrument.label}`}
          </p>
          {writtenPitchUnavailable && (
            <p className="display-notice">
              Written pitch display will be calculated from your selected instrument when the transposition domain is available.
            </p>
          )}
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
        </section>
        <button
          type="button"
          onClick={() => void toggleListening()}
          disabled={listeningState === "starting"}
          aria-describedby="listening-status"
        >
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
