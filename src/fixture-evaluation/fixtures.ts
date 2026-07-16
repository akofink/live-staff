export interface PianoFixture {
  readonly fileName: string;
  readonly expectedPitch: string;
  readonly expectedMidi: number;
}

export const pianoFixtures: readonly PianoFixture[] = [
  { fileName: "a3.m4a", expectedPitch: "A3", expectedMidi: 57 },
  { fileName: "bb1.m4a", expectedPitch: "Bb1", expectedMidi: 34 },
  { fileName: "bb2.m4a", expectedPitch: "Bb2", expectedMidi: 46 },
  { fileName: "c1.m4a", expectedPitch: "C1", expectedMidi: 24 },
  { fileName: "c2.m4a", expectedPitch: "C2", expectedMidi: 36 },
  { fileName: "c3.m4a", expectedPitch: "C3", expectedMidi: 48 },
  { fileName: "c4.m4a", expectedPitch: "C4", expectedMidi: 60 },
  { fileName: "c5.m4a", expectedPitch: "C5", expectedMidi: 72 },
  { fileName: "e3.m4a", expectedPitch: "E3", expectedMidi: 52 },
  { fileName: "f1.m4a", expectedPitch: "F1", expectedMidi: 29 },
  { fileName: "f2.m4a", expectedPitch: "F2", expectedMidi: 41 },
  { fileName: "g4.m4a", expectedPitch: "G4", expectedMidi: 67 },
];
