export type Clef = "treble" | "bass" | "alto" | "tenor";

export type AccidentalPreference = "sharp" | "flat";

export interface MidiRange {
  readonly lowestMidi: number;
  readonly highestMidi: number;
}

export interface InstrumentDefinition {
  readonly id: string;
  readonly name: string;
  readonly clef: Clef;
  readonly writtenToConcertSemitones: number;
  readonly writtenRange?: MidiRange;
  readonly accidentalPreference?: AccidentalPreference;
}

function instrument(definition: InstrumentDefinition): InstrumentDefinition {
  return Object.freeze({
    ...definition,
    writtenRange: definition.writtenRange && Object.freeze({ ...definition.writtenRange }),
  });
}

export const instruments = Object.freeze([
  instrument({
    id: "concert-pitch",
    name: "Concert pitch",
    clef: "treble",
    writtenToConcertSemitones: 0,
    accidentalPreference: "sharp",
  }),
  instrument({
    id: "bb-clarinet",
    name: "B-flat clarinet",
    clef: "treble",
    writtenToConcertSemitones: -2,
    writtenRange: { lowestMidi: 50, highestMidi: 94 },
    accidentalPreference: "flat",
  }),
  instrument({
    id: "eb-alto-saxophone",
    name: "E-flat alto saxophone",
    clef: "treble",
    writtenToConcertSemitones: -9,
    writtenRange: { lowestMidi: 58, highestMidi: 90 },
    accidentalPreference: "flat",
  }),
  instrument({
    id: "bb-tenor-saxophone",
    name: "B-flat tenor saxophone",
    clef: "treble",
    writtenToConcertSemitones: -14,
    writtenRange: { lowestMidi: 58, highestMidi: 90 },
    accidentalPreference: "flat",
  }),
  instrument({
    id: "bb-trumpet",
    name: "B-flat trumpet",
    clef: "treble",
    writtenToConcertSemitones: -2,
    writtenRange: { lowestMidi: 54, highestMidi: 84 },
    accidentalPreference: "flat",
  }),
  instrument({
    id: "f-horn",
    name: "F horn",
    clef: "treble",
    writtenToConcertSemitones: -7,
    writtenRange: { lowestMidi: 35, highestMidi: 77 },
    accidentalPreference: "flat",
  }),
  instrument({
    id: "trombone",
    name: "Trombone",
    clef: "bass",
    writtenToConcertSemitones: 0,
    writtenRange: { lowestMidi: 40, highestMidi: 70 },
    accidentalPreference: "flat",
  }),
  instrument({
    id: "tuba",
    name: "Tuba",
    clef: "bass",
    writtenToConcertSemitones: 0,
    writtenRange: { lowestMidi: 26, highestMidi: 65 },
    accidentalPreference: "flat",
  }),
  instrument({
    id: "violin",
    name: "Violin",
    clef: "treble",
    writtenToConcertSemitones: 0,
    writtenRange: { lowestMidi: 55, highestMidi: 117 },
    accidentalPreference: "sharp",
  }),
  instrument({
    id: "viola",
    name: "Viola",
    clef: "alto",
    writtenToConcertSemitones: 0,
    writtenRange: { lowestMidi: 48, highestMidi: 88 },
    accidentalPreference: "sharp",
  }),
  instrument({
    id: "cello",
    name: "Cello",
    clef: "bass",
    writtenToConcertSemitones: 0,
    writtenRange: { lowestMidi: 36, highestMidi: 84 },
    accidentalPreference: "sharp",
  }),
  instrument({
    id: "double-bass",
    name: "Double bass",
    clef: "bass",
    writtenToConcertSemitones: -12,
    writtenRange: { lowestMidi: 40, highestMidi: 84 },
    accidentalPreference: "sharp",
  }),
] as const);
