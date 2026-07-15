export function App() {
  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <p className="eyebrow">Live notation, not another tuner</p>
        <h1 id="app-title">Live Staff</h1>
        <p className="lede">
          Play a note. See its written notation for your instrument.
        </p>
        <button type="button" disabled aria-describedby="listening-status">
          Start listening
        </button>
        <p id="listening-status" className="status" role="status">
          Audio input is coming in the technical spike.
        </p>
      </section>
      <aside className="privacy-note">
        <h2>Private by design</h2>
        <p>
          When listening is available, microphone audio will be analyzed in your
          browser. It will not be uploaded, recorded, or sent to a server.
        </p>
      </aside>
    </main>
  );
}
