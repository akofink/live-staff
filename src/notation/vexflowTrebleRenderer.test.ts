import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = {
  formatterFormat: vi.fn(),
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
      void args;
    }

    addClef(...args: unknown[]): this {
      void args;
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

  class StaveNote {
    constructor(...args: unknown[]) {
      void args;
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
      void args;
      calls.voiceDraw();
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

  return { Accidental, Formatter, Renderer, Stave, StaveNote, Voice };
});

import { renderTrebleStaff } from "./vexflowTrebleRenderer";

describe("renderTrebleStaff", () => {
  beforeEach(() => {
    calls.formatterFormat.mockClear();
    calls.voiceDraw.mockClear();
  });

  it("formats every detected pitch before drawing repeated live renders", () => {
    const element = { replaceChildren: vi.fn() } as unknown as HTMLDivElement;

    renderTrebleStaff(element, 60, 400);
    renderTrebleStaff(element, 61, 400);
    renderTrebleStaff(element, 60, 400);

    expect(calls.formatterFormat).toHaveBeenCalledTimes(3);
    expect(calls.voiceDraw).toHaveBeenCalledTimes(3);
  });
});
