import { useEffect, useRef, useState } from "react";
import { AudioCaptureError, MicrophoneCapture, type AudioCaptureSession } from "../audio/microphone";

type ListeningState = "idle" | "starting" | "listening" | "error";

export function App() {
  const capture = useRef<MicrophoneCapture | undefined>(undefined);
  const session = useRef<AudioCaptureSession | undefined>(undefined);
  const [listeningState, setListeningState] = useState<ListeningState>("idle");
  const [message, setMessage] = useState("Ready to listen locally.");

  useEffect(() => {
    return () => {
      void session.current?.stop();
    };
  }, []);

  async function toggleListening() {
    if (session.current) {
      await session.current.stop();
      session.current = undefined;
      setListeningState("idle");
      setMessage("Listening stopped. Microphone resources were released.");
      return;
    }

    setListeningState("starting");
    setMessage("Requesting microphone access...");

    try {
      capture.current ??= new MicrophoneCapture();
      session.current = await capture.current.start(() => {
        // Frames stay local and will feed the replaceable pitch detector next.
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
          Play a note. See its written notation for your instrument.
        </p>
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
