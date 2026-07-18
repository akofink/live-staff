import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = { addClef: vi.fn(), connectorType: vi.fn(), stave: vi.fn() };
const appended: Array<{ name: string; attributes: Record<string, string>; textContent: string | null }> = [];

vi.stubGlobal("document", {
  createElementNS: (_namespace: string, name: string) => {
    const node = {
      name,
      attributes: {} as Record<string, string>,
      textContent: null as string | null,
      setAttribute(key: string, value: string) { this.attributes[key] = value; },
      append(child: (typeof appended)[number]) { appended.push(child); },
    };
    return node;
  },
});

vi.mock("vexflow", () => {
  class Renderer {
    static Backends = { SVG: "svg" };
    resize(): void {}
    getContext(): object { return {}; }
  }
  class Stave {
    constructor(...args: unknown[]) { calls.stave(...args); }
    addClef(...args: unknown[]): this { calls.addClef(...args); return this; }
    setContext(): this { return this; }
    draw(): void {}
  }
  class StaveConnector {
    static type = { BRACE: "brace", SINGLE_LEFT: "singleLeft" };
    setType(...args: unknown[]): this { calls.connectorType(...args); return this; }
    setContext(): this { return this; }
    draw(): void {}
  }
  return { Renderer, Stave, StaveConnector };
});

import { renderGrandStaff } from "./vexflowGrandStaffRenderer";

function element() {
  const svg = {
    append: (node: (typeof appended)[number]) => appended.push(node),
    getAttribute: () => null,
    setAttribute: vi.fn(),
    querySelector: () => undefined,
  } as unknown as SVGSVGElement;
  return {
    replaceChildren: vi.fn(),
    querySelector: vi.fn(() => svg),
  } as unknown as HTMLDivElement;
}

describe("renderGrandStaff", () => {
  beforeEach(() => {
    appended.length = 0;
    Object.values(calls).forEach((call) => call.mockClear());
  });

  it("renders both clefs and stemless chronological noteheads", () => {
    renderGrandStaff(element(), 67, "treble", "sharp", 400, [
      { concertMidi: 48, onsetMs: 0, endMs: 100 },
      { concertMidi: 67, onsetMs: 10_000, endMs: undefined },
    ], 10_000);

    expect(calls.addClef.mock.calls).toEqual([["treble"], ["bass"]]);
    expect(calls.connectorType.mock.calls).toEqual([["brace"], ["singleLeft"]]);
    const noteheads = appended.filter(({ name }) => name === "ellipse");
    expect(noteheads).toHaveLength(2);
    expect(noteheads[0].attributes).toMatchObject({ cx: "68", class: "staff-note-history" });
    expect(noteheads[1].attributes).toMatchObject({ cx: "382", fill: "#b15a23", class: "staff-note-current" });
    expect(appended.some(({ name }) => name === "path")).toBe(false);
  });

  it("draws accidentals and routes ledger lines on the appropriate stave", () => {
    renderGrandStaff(element(), 58, "bass", "flat", 320, [
      { concertMidi: 58, onsetMs: 1_000, endMs: undefined },
    ], 1_000);

    expect(appended.find(({ name }) => name === "text")?.textContent).toBe("♭");
    expect(appended.find(({ name }) => name === "ellipse")?.attributes.cy).toBe("127");
  });

  it("draws an empty persistent grand staff without note marks", () => {
    renderGrandStaff(element(), undefined, undefined, "sharp", 400);

    expect(calls.stave.mock.calls).toEqual([[28, 10, 360], [28, 92, 360]]);
    expect(appended.filter(({ name }) => name === "ellipse")).toEqual([]);
  });
});
