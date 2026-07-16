import { describe, expect, it } from "vitest";
import { detectPitch } from "./detectors/autocorrelation";
import { MainsHumFilter } from "./mainsHumFilter";
import { frequencyToNote } from "../pitch/note";

const sampleRate = 48_000;

function sineWave(frequencyHz: number, length = 48_000): Float32Array {
  return Float32Array.from(
    { length },
    (_, index) => Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate),
  );
}

function rms(samples: Float32Array): number {
  return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
}

function mix(...signals: readonly Float32Array[]): Float32Array {
  return Float32Array.from(signals[0], (_, index) => signals.reduce((sum, signal) => sum + signal[index], 0));
}

describe("MainsHumFilter", () => {
  it("strongly attenuates the selected power-line frequency", () => {
    const filter = new MainsHumFilter();
    filter.setFrequency(60);
    expect(rms(filter.process(sineWave(60), sampleRate).slice(sampleRate / 2))).toBeLessThan(0.1);
  });

  it("preserves a nearby concert B1", () => {
    const filter = new MainsHumFilter();
    filter.setFrequency(60);
    const filtered = filter.process(sineWave(61.735), sampleRate);

    expect(rms(filtered.slice(sampleRate / 2))).toBeGreaterThan(0.55);
    expect(frequencyToNote(detectPitch(filtered.slice(sampleRate / 2), sampleRate)!.frequencyHz).midi).toBe(35);
  });

  it("bypasses frames when mains hum suppression is off", () => {
    const frame = sineWave(60, 128);
    expect(new MainsHumFilter().process(frame, sampleRate)).toBe(frame);
  });

  it("allows a stronger musical pitch to win after removing 60 Hz hum", () => {
    const samples = mix(
      Float32Array.from(sineWave(60, 12_288), (sample) => sample * 0.8),
      Float32Array.from(sineWave(220, 12_288), (sample) => sample * 0.5),
    );
    const filter = new MainsHumFilter();
    filter.setFrequency(60);
    let filtered: Float32Array<ArrayBufferLike> = new Float32Array();

    for (let start = 0; start < samples.length; start += 4_096) {
      filtered = filter.process(samples.slice(start, start + 4_096), sampleRate);
    }

    expect(detectPitch(samples.slice(0, 4_096), sampleRate)?.frequencyHz).toBeLessThan(100);
    expect(frequencyToNote(detectPitch(filtered, sampleRate)!.frequencyHz).midi).toBe(57);
  });
});
