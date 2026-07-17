import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = {
  addClef: vi.fn(),
  connector: vi.fn(),
  connectorType: vi.fn(),
  formatterFormat: vi.fn(),
  stave: vi.fn(),
  staveInstance: vi.fn(),
  staveNote: vi.fn(),
  voiceDraw: vi.fn(),
};

vi.mock("vexflow", () => {
  class Accidental {
    constructor(...args: unknown[]) {
      void args;
    }
  }

  class Renderer {
    static Backends = { SVG: "svg" };

    constructor(...args: unknown[]) {
      void args;
    }

    resize(...args: unknown[]): void {
      void args;
    }

    getContext(): object {
      return {};
    }
  }

  class Stave {
    constructor(...args: unknown[]) {
      calls.stave(...args);
      calls.staveInstance(this);
    }

    addClef(...args: unknown[]): this {
      calls.addClef(...args);
      return this;
    }

    setContext(...args: unknown[]): this {
      void args;
      return this;
    }

    draw(): void {}

    getNoteStartX(): number {
      return 50;
    }

    getNoteEndX(): number {
      return 250;
    }
  }

  class StaveConnector {
    static type = { BRACE: "brace", SINGLE_LEFT: "singleLeft" };

    constructor(...args: unknown[]) {
      calls.connector(...args);
    }

    setType(...args: unknown[]): this {
      calls.connectorType(...args);
      return this;
    }

    setContext(...args: unknown[]): this {
      void args;
      return this;
    }

    draw(): void {}
  }

  class StaveNote {
    constructor(...args: unknown[]) {
      calls.staveNote(...args);
    }

    addModifier(...args: unknown[]): this {
      void args;
      return this;
    }
  }

  class Voice {
    addTickables(...args: unknown[]): this {
      void args;
      return this;
    }

    draw(...args: unknown[]): void {
      calls.voiceDraw(...args);
    }
  }

  class Formatter {
    joinVoices(...args: unknown[]): this {
      void args;
      return this;
    }

    format(...args: unknown[]): this {
      void args;
      calls.formatterFormat();
      return this;
    }
  }

  return { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice };
});

import { renderGrandStaff } from "./vexflowGrandStaffRenderer";

describe("renderGrandStaff", () => {
  beforeEach(() => {
    calls.addClef.mockClear();
    calls.connector.mockClear();
    calls.connectorType.mockClear();
    calls.formatterFormat.mockClear();
    calls.stave.mockClear();
    calls.staveInstance.mockClear();
    calls.staveNote.mockClear();
    calls.voiceDraw.mockClear();
  });

  it("renders both clefs and formats every detected pitch before repeated live renders", () => {
    const element = { replaceChildren: vi.fn() } as unknown as HTMLDivElement;

    renderGrandStaff(element, 60, "treble", "sharp", 400);
    renderGrandStaff(element, 59, "bass", "flat", 400);
    renderGrandStaff(element, 60, "treble", "sharp", 400);

    expect(calls.addClef).toHaveBeenCalledTimes(6);
    expect(calls.connectorType).toHaveBeenCalledTimes(6);
    expect(calls.formatterFormat).toHaveBeenCalledTimes(3);
    expect(calls.voiceDraw).toHaveBeenCalledTimes(3);
  });

  it("routes a flat-preference written pitch to the bass staff", () => {
    const element = { replaceChildren: vi.fn() } as unknown as HTMLDivElement;

    renderGrandStaff(element, 59, "bass", "flat", 400);

    const [trebleStave, bassStave] = calls.staveInstance.mock.calls.map(([stave]) => stave);

    expect(calls.stave).toHaveBeenNthCalledWith(1, 28, 28, 360);
    expect(calls.stave).toHaveBeenNthCalledWith(2, 28, 145, 360);
    expect(calls.connector).toHaveBeenNthCalledWith(1, trebleStave, bassStave);
    expect(calls.connector).toHaveBeenNthCalledWith(2, trebleStave, bassStave);
    expect(calls.staveNote).toHaveBeenCalledWith({ clef: "bass", keys: ["b/3"], duration: "q" });
    expect(calls.voiceDraw).toHaveBeenCalledWith(expect.anything(), bassStave);
  });

  it("draws the empty persistent grand staff without creating a note", () => {
    const element = { replaceChildren: vi.fn() } as unknown as HTMLDivElement;

    renderGrandStaff(element, undefined, undefined, "sharp", 400);

    expect(calls.stave).toHaveBeenCalledTimes(2);
    expect(calls.addClef).toHaveBeenNthCalledWith(1, "treble");
    expect(calls.addClef).toHaveBeenNthCalledWith(2, "bass");
    expect(calls.staveNote).not.toHaveBeenCalled();
    expect(calls.voiceDraw).not.toHaveBeenCalled();
  });
});
