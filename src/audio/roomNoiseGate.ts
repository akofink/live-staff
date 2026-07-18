import type { PitchEstimate } from "./detectors/autocorrelation";

export type RoomNoiseGateState = "bypass" | "calibrating" | "active";

const defaultCalibrationFrames = 12;
const minimumUsefulNoiseRms = 0.01;
const openRatio = 2;
const closeRatio = 1.5;

/** Rejects detector estimates near an explicitly measured, session-only room level. */
export class RoomNoiseGate {
  #calibrationFramesRemaining = 0;
  #calibrationFrameCount = 0;
  #calibrationSum = 0;
  #noiseRms: number | undefined;
  #open = false;

  get state(): RoomNoiseGateState {
    if (this.#calibrationFramesRemaining > 0) return "calibrating";
    return this.#noiseRms === undefined ? "bypass" : "active";
  }

  startCalibration(frameCount = defaultCalibrationFrames): void {
    this.#calibrationFramesRemaining = Math.max(1, Math.floor(frameCount));
    this.#calibrationFrameCount = this.#calibrationFramesRemaining;
    this.#calibrationSum = 0;
    this.#noiseRms = undefined;
    this.#open = false;
  }

  process(frame: Float32Array, estimate: PitchEstimate | null): PitchEstimate | null {
    if (this.state === "bypass") return estimate;

    const rms = frameRms(frame);
    if (this.#calibrationFramesRemaining > 0) {
      this.#calibrationSum += rms;
      this.#calibrationFramesRemaining -= 1;
      if (this.#calibrationFramesRemaining === 0) {
        const measuredRms = this.#calibrationSum / this.#calibrationFrameCount;
        this.#noiseRms = measuredRms >= minimumUsefulNoiseRms ? measuredRms : undefined;
      }
      return null;
    }

    const threshold = this.#noiseRms! * (this.#open ? closeRatio : openRatio);
    this.#open = estimate !== null && rms >= threshold;
    return this.#open ? estimate : null;
  }

  reset(): void {
    this.#calibrationFramesRemaining = 0;
    this.#calibrationFrameCount = 0;
    this.#calibrationSum = 0;
    this.#noiseRms = undefined;
    this.#open = false;
  }
}

function frameRms(frame: Float32Array): number {
  let sumSquares = 0;
  for (const sample of frame) sumSquares += sample * sample;
  return Math.sqrt(sumSquares / frame.length);
}
