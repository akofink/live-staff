export type ActiveStaff = "treble" | "bass";

/** Routes one displayed pitch to the most legible staff without boundary flicker. */
export function selectActiveStaff(previousStaff: ActiveStaff | undefined, midi: number): ActiveStaff {
  if (!Number.isInteger(midi)) {
    throw new RangeError("MIDI pitch must be an integer.");
  }

  if (previousStaff === "treble") {
    return midi <= 58 ? "bass" : "treble";
  }

  if (previousStaff === "bass") {
    return midi >= 60 ? "treble" : "bass";
  }

  return midi >= 60 ? "treble" : "bass";
}
