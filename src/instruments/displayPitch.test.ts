import { describe, expect, it } from "vitest";
import { instruments } from "./instruments";
import { toDisplayPitch } from "./displayPitch";

function getInstrument(id: string) {
  const instrument = instruments.find((candidate) => candidate.id === id);
  if (!instrument) {
    throw new Error(`Missing instrument definition: ${id}`);
  }
  return instrument;
}

describe("toDisplayPitch", () => {
  it.each([
    ["concert pitch", "concert-pitch", "C4"],
    ["B-flat clarinet", "bb-clarinet", "D4"],
    ["B-flat trumpet", "bb-trumpet", "D4"],
    ["E-flat alto saxophone", "eb-alto-saxophone", "A4"],
    ["F horn", "f-horn", "G4"],
  ])("renders concert C4 as written pitch for %s", (_name, instrumentId, noteName) => {
    expect(toDisplayPitch(60, "written", getInstrument(instrumentId))).toMatchObject({ name: noteName });
  });

  it("keeps detector MIDI unchanged for concert display", () => {
    expect(toDisplayPitch(61, "concert", getInstrument("bb-trumpet"))).toEqual({
      midi: 61,
      name: "C#4",
    });
  });

  it("spells written accidentals consistently with a flat-preference instrument", () => {
    expect(toDisplayPitch(61, "written", getInstrument("bb-trumpet"))).toEqual({
      midi: 63,
      name: "E-flat4",
    });
  });
});
