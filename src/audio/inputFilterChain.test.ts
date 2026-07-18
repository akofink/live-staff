import { describe, expect, it } from "vitest";
import { coefficientsForBand, filterResponseDb, InputFilterChain, type InputFilterBand } from "./inputFilterChain";

const sampleRate = 48_000;
const notch: InputFilterBand = { id: "noise", type: "notch", enabled: true, frequencyHz: 60, q: 20, attenuationDb: 18 };

function sine(frequencyHz: number, length = 48_000) {
  return Float32Array.from({ length }, (_, index) => Math.sin(2 * Math.PI * frequencyHz * index / sampleRate));
}

function rms(samples: Float32Array) {
  let total = 0;
  for (const sample of samples) total += sample * sample;
  return Math.sqrt(total / samples.length);
}

describe("input filter coefficients and response", () => {
  it.each([44_100, 48_000])("places Butterworth cutoffs at -3 dB at %i Hz", (rate) => {
    const highpass = { id: "hp", type: "highpass", enabled: true, frequencyHz: 40 } as const;
    const lowpass = { id: "lp", type: "lowpass", enabled: true, frequencyHz: 14_000 } as const;
    expect(filterResponseDb([highpass], 40, rate)).toBeCloseTo(-3.01, 1);
    expect(filterResponseDb([lowpass], 14_000, rate)).toBeCloseTo(-3.01, 1);
    expect(Object.values(coefficientsForBand(highpass, rate)).every(Number.isFinite)).toBe(true);
  });

  it("composes enabled responses and honors bypass", () => {
    const second = { ...notch, id: "second", frequencyHz: 120, attenuationDb: 12 };
    const combined = filterResponseDb([notch, second], 60, sampleRate);
    expect(combined).toBeCloseTo(filterResponseDb([notch], 60, sampleRate) + filterResponseDb([second], 60, sampleRate), 8);
    expect(combined).toBeLessThan(-17);
    expect(filterResponseDb([notch, second], 60, sampleRate, true)).toBe(0);
  });
});

describe("InputFilterChain", () => {
  it("returns the original frame for independent and global bypass", () => {
    const frame = sine(60, 256);
    const chain = new InputFilterChain();
    chain.configure([{ ...notch, enabled: false }], false);
    expect(chain.process(frame, sampleRate)).toBe(frame);
    chain.configure([notch], true);
    expect(chain.process(frame, sampleRate)).toBe(frame);
  });

  it("reuses one output buffer and applies bounded center attenuation", () => {
    const chain = new InputFilterChain();
    chain.configure([notch], false);
    const output = chain.process(sine(60), sampleRate);
    const secondOutput = chain.process(sine(60), sampleRate);
    expect(secondOutput).toBe(output);
    expect(20 * Math.log10(rms(secondOutput.slice(24_000)) / Math.SQRT1_2)).toBeCloseTo(-18, 0);
  });

  it("clears live state after a setting change", () => {
    const chain = new InputFilterChain();
    chain.configure([notch], false);
    chain.process(Float32Array.from({ length: 4_096 }, (_, index) => index === 0 ? 1 : 0), sampleRate);
    chain.configure([{ ...notch, frequencyHz: 120 }], false);
    expect(Array.from(chain.process(new Float32Array(128), sampleRate))).toEqual(Array(128).fill(0));
  });

  it("preserves state continuously across frame boundaries", () => {
    const signal = sine(60, 12_288);
    const whole = new InputFilterChain();
    whole.configure([notch], false);
    const expected = whole.process(signal, sampleRate).slice();
    const framed = new InputFilterChain();
    framed.configure([notch], false);
    const actual = new Float32Array(signal.length);
    for (let start = 0; start < signal.length; start += 4_096) actual.set(framed.process(signal.slice(start, start + 4_096), sampleRate), start);
    expect(actual).toEqual(expected);
  });
});
