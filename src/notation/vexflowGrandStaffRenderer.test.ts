import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = {
  accidental: vi.fn(),
  addClef: vi.fn(),
  connectorType: vi.fn(),
  drawNote: vi.fn(),
  groupAttribute: vi.fn(),
  openGroup: vi.fn(),
  stave: vi.fn(),
  tickX: vi.fn(),
};

vi.mock("vexflow", () => {
  class Renderer {
    static Backends = { SVG: "svg" };
    resize(): void {}
    getContext(): object {
      return {
        openGroup: (...args: unknown[]) => {
          calls.openGroup(...args);
          return { setAttribute: calls.groupAttribute };
        },
        closeGroup: vi.fn(),
      };
    }
  }
  class Stave {
    constructor(...args: unknown[]) { calls.stave(...args); }
    addClef(...args: unknown[]): this { calls.addClef(...args); return this; }
    setContext(): this { return this; }
    draw(): void {}
    getNoteStartX(): number { return 68; }
  }
  class StaveConnector {
    static type = { BRACE: "brace", SINGLE_LEFT: "singleLeft" };
    setType(...args: unknown[]): this { calls.connectorType(...args); return this; }
    setContext(): this { return this; }
    draw(): void {}
  }
  class Accidental {
    constructor(value: string) { calls.accidental(value); }
  }
  class StaveNote {
    readonly attributes: Record<string, string | undefined> = {};
    readonly modifiers: unknown[] = [];
    constructor(readonly options: Record<string, unknown>) {}
    addModifier(modifier: unknown): this { this.modifiers.push(modifier); return this; }
    setStave(stave: unknown): this { this.attributes.stave = String(stave); return this; }
    setContext(): this { return this; }
    setStyle(): this { return this; }
    setStemStyle(): this { return this; }
    draw(): void { calls.drawNote({ options: this.options, attributes: this.attributes, modifiers: this.modifiers }); }
  }
  class TickContext {
    addTickable(): this { return this; }
    preFormat(): this { return this; }
    setX(x: number): this { calls.tickX(x); return this; }
  }
  return { Accidental, Renderer, Stave, StaveConnector, StaveNote, TickContext };
});

import { renderGrandStaff } from "./vexflowGrandStaffRenderer";

function element() {
  const svg = { querySelector: () => undefined } as unknown as SVGSVGElement;
  return {
    replaceChildren: vi.fn(),
    querySelector: vi.fn(() => svg),
  } as unknown as HTMLDivElement;
}

describe("renderGrandStaff", () => {
  beforeEach(() => Object.values(calls).forEach((call) => call.mockClear()));

  it("renders native stemless notes and accidentals with a stable current coordinate", () => {
    const target = element();
    renderGrandStaff(target, 67, "treble", "sharp", 400, [
      { concertMidi: 61, onsetMs: 0, endMs: 100 },
      { concertMidi: 60, onsetMs: 200, endMs: 300 },
      { concertMidi: 67, onsetMs: 10_000, endMs: undefined },
    ], 10_000);

    expect(calls.addClef.mock.calls).toEqual([["treble"], ["bass"]]);
    expect(calls.accidental.mock.calls).toEqual([["#"], ["n"]]);
    expect(calls.drawNote).toHaveBeenCalledTimes(3);
    expect(calls.drawNote.mock.calls[0][0].options).toMatchObject({ duration: "q", autoStem: false });
    expect(calls.groupAttribute).toHaveBeenCalledWith("opacity", "0.3");
    expect(calls.tickX.mock.calls.at(-1)).toEqual([298]);

    renderGrandStaff(target, 69, "treble", "sharp", 400, [
      { concertMidi: 67, onsetMs: 10_000, endMs: 10_100 },
      { concertMidi: 69, onsetMs: 10_200, endMs: undefined },
    ], 10_200);
    expect(calls.tickX.mock.calls.at(-1)).toEqual([298]);
    expect(calls.stave).toHaveBeenCalledTimes(2);
  });

  it("ages history without rebuilding the persistent staves", () => {
    const target = element();
    const history = [{ concertMidi: 60, onsetMs: 0, endMs: 100 }];
    renderGrandStaff(target, undefined, undefined, "sharp", 320, history, 1_000);
    renderGrandStaff(target, undefined, undefined, "sharp", 320, history, 6_000);

    const opacities = calls.groupAttribute.mock.calls
      .filter(([name]) => name === "opacity")
      .map(([, value]) => value);
    expect(opacities).toEqual(["0.7050000000000001", "0.48"]);
    expect(calls.stave).toHaveBeenCalledTimes(2);
  });

  it("uses native flat notation and the bass clef", () => {
    renderGrandStaff(element(), 58, "bass", "flat", 320, [
      { concertMidi: 58, onsetMs: 1_000, endMs: undefined },
    ], 1_000);

    expect(calls.accidental).toHaveBeenCalledWith("b");
    expect(calls.drawNote.mock.calls[0][0].options).toMatchObject({ keys: ["b/3"], clef: "bass" });
  });

  it("draws an empty persistent grand staff without note marks", () => {
    renderGrandStaff(element(), undefined, undefined, "sharp", 400);

    expect(calls.stave.mock.calls).toEqual([[28, 10, 360], [28, 92, 360]]);
    expect(calls.drawNote).not.toHaveBeenCalled();
  });
});
