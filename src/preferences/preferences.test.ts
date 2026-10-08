import { describe, expect, it } from "vitest";
import { instruments } from "../instruments/instruments";
import { targetInstrumentOptions } from "./preferences";

describe("target instrument options", () => {
  it("exposes existing treble and bass instruments without claiming unsupported clefs", () => {
    expect(targetInstrumentOptions.map(({ id }) => id)).toEqual(
      instruments
        .filter(({ clef }) => clef === "treble" || clef === "bass")
        .map(({ id }) => id),
    );
    expect(targetInstrumentOptions.map(({ id }) => id)).not.toContain("viola");
  });
});
