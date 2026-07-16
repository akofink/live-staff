import type { DetectedNote } from "./note";

export class NoteStabilizer {
  #candidateMidi: number | undefined;
  #candidateFrames = 0;
  #stableNote: DetectedNote | undefined;

  constructor(private readonly requiredFrames = 2) {}

  update(note: DetectedNote | null): DetectedNote | null {
    if (!note) {
      this.#candidateMidi = undefined;
      this.#candidateFrames = 0;
      return null;
    }

    if (note.midi === this.#candidateMidi) {
      this.#candidateFrames += 1;
    } else {
      this.#candidateMidi = note.midi;
      this.#candidateFrames = 1;
    }

    if (this.#candidateFrames >= this.requiredFrames) {
      this.#stableNote = note;
    }

    return this.#stableNote ?? null;
  }

  reset(): void {
    this.#candidateMidi = undefined;
    this.#candidateFrames = 0;
    this.#stableNote = undefined;
  }
}
