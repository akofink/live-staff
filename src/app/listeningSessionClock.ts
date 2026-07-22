export class ListeningSessionClock {
  #elapsedMs = 0;
  #startedAtMs: number | undefined;

  now(timestampMs: number): number {
    return this.#elapsedMs + (this.#startedAtMs === undefined ? 0 : timestampMs - this.#startedAtMs);
  }

  start(timestampMs: number): void {
    if (this.#startedAtMs === undefined) this.#startedAtMs = timestampMs;
  }

  pause(timestampMs: number): void {
    this.#elapsedMs = this.now(timestampMs);
    this.#startedAtMs = undefined;
  }

  reset(timestampMs: number): void {
    this.#elapsedMs = 0;
    this.#startedAtMs = timestampMs;
  }
}
