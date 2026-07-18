import { describe, expect, it } from "vitest";
import { detectPitch } from "./detectors/autocorrelation";
import { RoomNoiseGate } from "./roomNoiseGate";

const sampleRate = 48_000;
const frameLength = 4_096;

function mixture(fundamentalHz: number | undefined, voiceLevel: number, fanLevel = 0.025) {
  let seed = 0x59;
  return Float32Array.from({ length: frameLength }, (_, index) => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const broadband = (seed / 0xffffffff) * 2 - 1;
    const fan = fanLevel * (0.8 * Math.sin((2 * Math.PI * 73 * index) / sampleRate) + 0.35 * broadband);
    if (fundamentalHz === undefined) return fan;
    const phase = (2 * Math.PI * fundamentalHz * index) / sampleRate;
    return fan + voiceLevel * (Math.sin(phase) + 0.45 * Math.sin(2 * phase) + 0.2 * Math.sin(3 * phase));
  });
}

describe("RoomNoiseGate", () => {
  it("rejects a calibrated steady fan while retaining baritone and bass notes", () => {
    const fan = mixture(undefined, 0);
    const gate = new RoomNoiseGate();
    gate.startCalibration();
    for (let index = 0; index < 12; index += 1) {
      expect(gate.process(fan, detectPitch(fan, sampleRate))).toBeNull();
    }

    expect(gate.state).toBe("active");
    expect(gate.process(fan, detectPitch(fan, sampleRate))).toBeNull();
    for (const frequencyHz of [61.74, 82.41, 110, 146.83]) {
      const noteGate = new RoomNoiseGate();
      noteGate.startCalibration(1);
      noteGate.process(fan, null);
      const voice = mixture(frequencyHz, 0.055);
      const estimate = noteGate.process(voice, detectPitch(voice, sampleRate));
      expect(Math.abs(estimate!.frequencyHz - frequencyHz)).toBeLessThan(1);
    }
  });

  it("bypasses an ineffective silent calibration", () => {
    const gate = new RoomNoiseGate();
    gate.startCalibration(1);
    gate.process(new Float32Array(frameLength), null);
    expect(gate.state).toBe("bypass");
  });

  it("uses hysteresis to avoid opening and closing at one threshold", () => {
    const gate = new RoomNoiseGate();
    const fan = mixture(undefined, 0);
    gate.startCalibration(1);
    gate.process(fan, detectPitch(fan, sampleRate));
    const loud = mixture(110, 0.055);
    const trailing = mixture(110, 0.045);
    expect(gate.process(loud, detectPitch(loud, sampleRate))).not.toBeNull();
    expect(gate.process(trailing, detectPitch(trailing, sampleRate))).not.toBeNull();
  });

  it("is a true detector-result bypass before calibration", () => {
    const gate = new RoomNoiseGate();
    const frame = mixture(82.41, 0.055);
    const estimate = detectPitch(frame, sampleRate);
    expect(gate.process(frame, estimate)).toBe(estimate);
  });
});
