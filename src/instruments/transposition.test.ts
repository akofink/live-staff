import { describe, expect, it } from "vitest";
import { instruments, type InstrumentDefinition } from "./instruments";
import { concertToWrittenMidi } from "./transposition";

function getInstrument(id: string): InstrumentDefinition {
  const instrument = instruments.find((candidate) => candidate.id === id);

  if (!instrument) {
    throw new Error(`Missing instrument definition: ${id}`);
  }

  return instrument;
}

describe("instruments", () => {
  it("provides immutable definitions with human-readable names", () => {
    expect(instruments.map((instrument) => instrument.id)).toEqual([
      "concert-pitch",
      "bb-clarinet",
      "eb-alto-saxophone",
      "bb-tenor-saxophone",
      "bb-trumpet",
      "f-horn",
      "trombone",
      "tuba",
      "violin",
      "viola",
      "cello",
      "double-bass",
    ]);
    expect(instruments.every((instrument) => instrument.name.length > 0)).toBe(true);
    expect(Object.isFrozen(instruments)).toBe(true);
    expect(instruments.every(Object.isFrozen)).toBe(true);
    expect(instruments.filter((instrument) => instrument.writtenRange).every(
      (instrument) => Object.isFrozen(instrument.writtenRange),
    )).toBe(true);
  });
});

describe("concertToWrittenMidi", () => {
  it.each([
    ["concert pitch", "concert-pitch", 60, 60],
    ["B-flat clarinet", "bb-clarinet", 60, 62],
    ["B-flat trumpet", "bb-trumpet", 60, 62],
    ["E-flat alto saxophone", "eb-alto-saxophone", 60, 69],
    ["F horn", "f-horn", 60, 67],
  ])("converts concert C4 for %s", (_name, instrumentId, concertMidi, writtenMidi) => {
    expect(concertToWrittenMidi(concertMidi, getInstrument(instrumentId))).toBe(writtenMidi);
  });

  it("supports positive written-to-concert transposition", () => {
    const piccolo: InstrumentDefinition = {
      id: "piccolo",
      name: "Piccolo",
      clef: "treble",
      writtenToConcertSemitones: 12,
    };

    expect(concertToWrittenMidi(72, piccolo)).toBe(60);
  });

  it("crosses octave boundaries without changing the interval", () => {
    expect(concertToWrittenMidi(12, getInstrument("bb-clarinet"))).toBe(14);
    expect(concertToWrittenMidi(127, getInstrument("double-bass"))).toBe(139);
  });
});
