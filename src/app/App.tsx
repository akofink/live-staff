import { useEffect, useRef, useState } from "react";
import { AudioCaptureError, MicrophoneCapture, type AudioCaptureSession } from "../audio/microphone";
import { detectPitch } from "../audio/detectors/autocorrelation";
import { frequencyToNote, type DetectedNote } from "../pitch/note";
import { NoteStabilizer } from "../pitch/stabilizer";

type ListeningState = "idle" | "starting" | "listening" | "error";

export function App() {
  const capture = useRef<MicrophoneCapture | undefined>(undefined);
  const session = useRef<AudioCaptureSession | undefined>(undefined);
  const stabilizer = useRef(new NoteStabilizer());
  const lastDetection = useRef(0);
  const [listeningState, setListeningState] = useState<ListeningState>("idle");
  const [message, setMessage] = useState("Ready to listen locally.");
  const [note, setNote] = useState<DetectedNote | undefined>(undefined);

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
      setNote(undefined);
      setListeningState("idle");
      setMessage("Listening stopped. Microphone resources were released.");
      return;
    }

    setListeningState("starting");
    setMessage("Requesting microphone access...");

    try {
      capture.current ??= new MicrophoneCapture();
      session.current = await capture.current.start((frame) => {
        const timestamp = performance.now();
        if (timestamp - lastDetection.current < 80) {
          return;
        }
        lastDetection.current = timestamp;

        const estimate = detectPitch(frame, session.current?.sampleRate ?? 44_100);
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

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <p className="eyebrow">Live notation, not another tuner</p>
        <h1 id="app-title">Live Staff</h1>
        <p className="lede">
          Play a note. See its concert pitch appear live.
        </p>
        <section className="note-display" aria-label="Detected concert pitch">
          <p className="note-name">{note?.name ?? "--"}</p>
          <p className="note-kind">Concert pitch</p>
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
