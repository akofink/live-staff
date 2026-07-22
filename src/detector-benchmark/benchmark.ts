import { detectPitch } from "../audio/detectors/autocorrelation";
import { frequencyToNote } from "../pitch/note";
import { NoteStabilizer } from "../pitch/stabilizer";
import { RoomNoiseGate } from "../audio/roomNoiseGate";
import { InputFilterChain, defaultNotch } from "../audio/inputFilterChain";
import { MainsHumFilter } from "../audio/mainsHumFilter";
import { detectCombProjection, detectFundamentalAware, detectHarmonicSieve, detectLandmarkHistogram, detectMultiPeriod, detectSwipeLike, type BenchmarkDetector } from "./candidates";

export const benchmarkDetectors: Readonly<Record<string, BenchmarkDetector>> = {
  control: detectPitch,
  fundamentalAware: detectFundamentalAware,
  multiPeriod: detectMultiPeriod,
  combProjection: detectCombProjection,
  landmarkHistogram: detectLandmarkHistogram,
  swipeLike: detectSwipeLike,
  harmonicSieve: detectHarmonicSieve,
};

export interface LabeledFrame { readonly id: string; readonly samples: Float32Array; readonly sampleRate: number; readonly expectedMidi: number | null }

export function recordedFrameStarts(samples: Float32Array, sampleRate: number, frameLength: number) {
  const blockLength = Math.floor(sampleRate * 0.02);
  const blockRms: number[] = [];
  for (let start = 0; start + blockLength <= samples.length; start += blockLength) {
    let energy = 0;
    for (let index = start; index < start + blockLength; index += 1) energy += samples[index] * samples[index];
    blockRms.push(Math.sqrt(energy / blockLength));
  }
  const noiseFloor = [...blockRms.slice(0, Math.min(10, blockRms.length))].sort((a, b) => a - b)[Math.floor(Math.min(9, blockRms.length - 1) / 2)] ?? 0;
  const threshold = Math.max(0.01, noiseFloor * 4);
  let onsetBlock = blockRms.findIndex((rms, index) => rms >= threshold && (index === 0 || blockRms[index - 1] < threshold));
  if (onsetBlock < 0) onsetBlock = blockRms.findIndex((rms) => rms >= 0.01);
  if (onsetBlock < 0) return [];
  const onset = onsetBlock * blockLength;
  const schedule = [
    ...Array.from({ length: 10 }, (_, index) => ["dense-onset", index * 0.02] as const),
    ...Array.from({ length: 9 }, (_, index) => ["live-overlap", 0.2 + index * 0.05] as const),
    ...Array.from({ length: 8 }, (_, index) => ["stable-sustain", 0.7 + index * 0.1] as const),
  ];
  return schedule.map(([label, offset]) => ({ label, start: onset + Math.floor(offset * sampleRate) }))
    .filter(({ start }) => start + frameLength <= samples.length);
}

export function seededNoise(length: number, amplitude: number, seed: number): Float32Array {
  let state = seed >>> 0;
  return Float32Array.from({ length }, () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return (state / 0xffffffff * 2 - 1) * amplitude;
  });
}

export function tone(midi: number, sampleRate = 48_000, length = 4_096, harmonics = [1, 0.35, 0.15], noise = 0): Float32Array {
  const hz = 440 * 2 ** ((midi - 69) / 12);
  const random = seededNoise(length, noise, midi * 7919 + length);
  return Float32Array.from({ length }, (_, index) => harmonics.reduce(
    (sum, amplitude, harmonic) => sum + amplitude * Math.sin(2 * Math.PI * hz * (harmonic + 1) * index / sampleRate + 0.31), random[index]));
}

export function syntheticCorpus(): readonly LabeledFrame[] {
  const frames: LabeledFrame[] = [];
  for (let midi = 34; midi <= 83; midi += 1) {
    frames.push({ id: `range-${midi}-44100`, samples: tone(midi, 44_100), sampleRate: 44_100, expectedMidi: midi });
    frames.push({ id: `range-${midi}-48000`, samples: tone(midi), sampleRate: 48_000, expectedMidi: midi });
  }
  for (const midi of [34, 46, 58, 69, 81]) {
    frames.push({ id: `harmonic-dominant-${midi}`, samples: tone(midi, 48_000, 4_096, [0.12, 1, 0.55]), sampleRate: 48_000, expectedMidi: midi });
    frames.push({ id: `missing-fundamental-${midi}`, samples: tone(midi, 48_000, 4_096, [0, 1, 0.6]), sampleRate: 48_000, expectedMidi: midi });
  }
  frames.push({ id: "silence", samples: new Float32Array(4_096), sampleRate: 48_000, expectedMidi: null });
  frames.push({ id: "quiet-tone", samples: tone(69).map((value) => value * 0.004), sampleRate: 48_000, expectedMidi: null });
  frames.push({ id: "uncertain-noise", samples: seededNoise(4_096, 0.08, 0x12345678), sampleRate: 48_000, expectedMidi: null });
  const room = seededNoise(4_096, 0.025, 77);
  frames.push({ id: "room-calibration-noise", samples: room, sampleRate: 48_000, expectedMidi: null });
  frames.push({ id: "room-plus-note", samples: tone(57).map((value, index) => value * 0.12 + room[index]), sampleRate: 48_000, expectedMidi: 57 });
  const hum = Float32Array.from({ length: 4_096 }, (_, index) => 0.3 * Math.sin(2 * Math.PI * 60 * index / 48_000));
  frames.push({ id: "hum-only", samples: hum, sampleRate: 48_000, expectedMidi: null });
  frames.push({ id: "hum-filter-mix", samples: tone(57).map((value, index) => value * 0.45 + hum[index]), sampleRate: 48_000, expectedMidi: 57 });
  return frames;
}

function percentile(values: readonly number[], fraction: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

export function evaluateFrames(frames: readonly LabeledFrame[], detector: BenchmarkDetector) {
  const windows = frames.map((frame) => {
    const estimate = detector(frame.samples, frame.sampleRate);
    const detectedMidi = estimate ? frequencyToNote(estimate.frequencyHz).midi : null;
    const centsError = estimate && frame.expectedMidi !== null
      ? 1_200 * Math.log2(estimate.frequencyHz / (440 * 2 ** ((frame.expectedMidi - 69) / 12))) : null;
    return { id: frame.id, expectedMidi: frame.expectedMidi, estimate, detectedMidi, centsError,
      match: detectedMidi !== null && detectedMidi === frame.expectedMidi,
      octaveError: detectedMidi !== null && frame.expectedMidi !== null && Math.abs(detectedMidi - frame.expectedMidi) >= 12 && (detectedMidi - frame.expectedMidi) % 12 === 0 };
  });
  const pitched = windows.filter((window) => window.expectedMidi !== null);
  const absent = windows.filter((window) => window.expectedMidi === null);
  const cents = windows.flatMap((window) => window.centsError === null ? [] : [window.centsError]);
  const confidenceCorrect = windows.flatMap((window) => window.match && window.estimate ? [window.estimate.confidence] : []);
  const confidenceIncorrect = windows.flatMap((window) => !window.match && window.estimate ? [window.estimate.confidence] : []);
  const riskCoverage = [0.72, 0.8, 0.9, 0.95].map((threshold) => {
    const covered = windows.filter((window) => window.estimate && window.estimate.confidence >= threshold);
    return { threshold, covered: covered.length, coverage: covered.length / windows.length,
      selectiveRisk: covered.length ? covered.filter((window) => !window.match).length / covered.length : null };
  });
  return { windows, emitted: windows.filter((window) => window.estimate).length, absent: windows.filter((window) => !window.estimate).length,
    matches: windows.filter((window) => window.match).length, octaveErrors: windows.filter((window) => window.octaveError).length,
    matchingGroups: [...new Set(windows.filter((window) => window.match).map((window) => window.id.split(":")[0]))],
    pitchAccuracy: pitched.filter((window) => window.match).length / pitched.length,
    falsePositiveRate: absent.filter((window) => window.estimate).length / absent.length,
    cents: { p50: percentile(cents.map(Math.abs), 0.5), p95: percentile(cents.map(Math.abs), 0.95), minimum: percentile(cents, 0), maximum: percentile(cents, 1) },
    confidence: { correctP50: percentile(confidenceCorrect, 0.5), incorrectP50: percentile(confidenceIncorrect, 0.5), riskCoverage } };
}

export function modeledLatency(detector: BenchmarkDetector, midi = 69) {
  const stabilizer = new NoteStabilizer();
  let firstCorrectMs: number | null = null;
  let firstStableMs: number | null = null;
  for (let ms = 80; ms <= 400; ms += 80) {
    const estimate = detector(tone(midi), 48_000);
    const note = estimate ? frequencyToNote(estimate.frequencyHz) : null;
    if (note?.midi === midi && firstCorrectMs === null) firstCorrectMs = ms;
    if (stabilizer.update(note)?.midi === midi && firstStableMs === null) firstStableMs = ms;
  }
  return { frameCadenceMs: 80, firstCorrectMs, firstStableMs };
}

function roomMixture(frequencyHz: number | undefined, voiceLevel: number, fanLevel = 0.025) {
  let seed = 0x59;
  return Float32Array.from({ length: 4_096 }, (_, index) => {
    seed = (Math.imul(1_664_525, seed) + 1_013_904_223) >>> 0;
    const fan = fanLevel * (0.8 * Math.sin(2 * Math.PI * 73 * index / 48_000) + 0.35 * (seed / 0xffffffff * 2 - 1));
    if (frequencyHz === undefined) return fan;
    const phase = 2 * Math.PI * frequencyHz * index / 48_000;
    return fan + voiceLevel * (Math.sin(phase) + 0.45 * Math.sin(2 * phase) + 0.2 * Math.sin(3 * phase));
  });
}

export function establishedScenarioResults(detector: BenchmarkDetector) {
  const corpus = syntheticCorpus();
  const range = evaluateFrames(corpus.filter((frame) => frame.id.startsWith("range-")), detector);
  const harmonics = evaluateFrames(corpus.filter((frame) => frame.id.startsWith("harmonic-") || frame.id.startsWith("missing-fundamental-")), detector);
  const absences = evaluateFrames(corpus.filter((frame) => ["silence", "quiet-tone", "uncertain-noise"].includes(frame.id)), detector);
  const fan = roomMixture(undefined, 0);
  const gate = new RoomNoiseGate();
  gate.startCalibration();
  for (let index = 0; index < 12; index += 1) gate.process(fan, detector(fan, 48_000));
  const fanRejected = gate.process(fan, detector(fan, 48_000)) === null;
  const roomNotes = [61.74, 82.41, 110, 146.83].map((frequencyHz) => {
    const noteGate = new RoomNoiseGate();
    noteGate.startCalibration(1);
    noteGate.process(fan, null);
    const estimate = noteGate.process(roomMixture(frequencyHz, 0.055), detector(roomMixture(frequencyHz, 0.055), 48_000));
    return { frequencyHz, estimate, pass: estimate !== null && Math.abs(estimate.frequencyHz - frequencyHz) < 1 };
  });
  const mixed = Float32Array.from({ length: 12_288 }, (_, index) =>
    0.8 * Math.sin(2 * Math.PI * 60 * index / 48_000) + 0.5 * Math.sin(2 * Math.PI * 220 * index / 48_000));
  const humFilter = new MainsHumFilter();
  humFilter.setFrequency(60);
  let humFiltered: Float32Array<ArrayBufferLike> = new Float32Array(4_096);
  for (let start = 0; start < mixed.length; start += 4_096) humFiltered = humFilter.process(mixed.slice(start, start + 4_096), 48_000);
  const chain = new InputFilterChain();
  chain.configure([{ id: "benchmark-hum", ...defaultNotch }], false);
  let chainFiltered: Float32Array<ArrayBufferLike> = new Float32Array(4_096);
  for (let start = 0; start < mixed.length; start += 4_096) chainFiltered = chain.process(mixed.slice(start, start + 4_096), 48_000).slice();
  const humMidi = (frame: Float32Array) => {
    const estimate = detector(frame, 48_000);
    return estimate ? frequencyToNote(estimate.frequencyHz).midi : null;
  };
  const latency = modeledLatency(detector);
  return {
    supportedRange: { ...range, pass: range.pitchAccuracy === 1 && range.octaveErrors === 0 && (range.cents.p95 ?? Infinity) <= 20 },
    harmonicRecovery: { ...harmonics, pass: harmonics.pitchAccuracy === 1 && harmonics.octaveErrors === 0 },
    absences: { ...absences, pass: absences.emitted === 0 },
    calibratedRoomGate: { fanRejected, notes: roomNotes, pass: fanRejected && roomNotes.every((note) => note.pass) },
    humFilters: { expectedMidi: 57, rawMidi: humMidi(mixed.slice(0, 4_096)), mainsHumFilterMidi: humMidi(humFiltered), inputFilterChainMidi: humMidi(chainFiltered),
      pass: humMidi(humFiltered) === 57 && humMidi(chainFiltered) === 57 },
    latency: { ...latency, pass: latency.firstCorrectMs !== null && latency.firstStableMs !== null && latency.firstStableMs <= 250 },
  };
}

export function detectorAllocationInventory(detectorName: string) {
  if (detectorName === "control") return { perCall: { typedArrays: 0, dynamicJsArrays: 1, plainObjects: "1 settings object plus 0 or 1 result object" },
    bytes: "unknown: JS number-array capacity, elements, and plain-object representation are engine-dependent", retainedReferences: 0 };
  if (detectorName === "landmarkHistogram") return { perCall: { typedArrays: 1, dynamicJsArrays: 1, plainObjects: "0 or 1 result object" },
    typedArrayPayload: "Uint16Array(floor(sampleRate / 55) + 1)", bytes: "unknown: crossing-array and result-object representation are engine-dependent", retainedReferences: 0 };
  if (detectorName === "swipeLike" || detectorName === "harmonicSieve") return { perCall: { typedArrays: 0, dynamicJsArrays: 0, plainObjects: "0 or 1 result object" },
    retained: "Two Float64Array FFT work buffers and one Uint32Array bit-reversal table per observed power-of-two frame size",
    bytes: "retained typed-array payload is FFT size * 20; result-object representation is engine-dependent", retainedReferences: 3 };
  return { perCall: { typedArrays: 1, dynamicJsArrays: 0, plainObjects: "1 correlation wrapper plus 0 or 1 result object" },
    typedArrayPayload: "Float64Array(maximumLag - minimumLag + 1)", bytes: "typed-array payload is length * 8; plain-object representation is engine-dependent", retainedReferences: 0 };
}

export function cpuTiming(detector: BenchmarkDetector, frames: readonly LabeledFrame[]) {
  const selected = frames.filter((_, index) => index % Math.max(1, Math.floor(frames.length / 12)) === 0).slice(0, 12);
  for (let index = 0; index < 2; index += 1) for (const frame of selected) detector(frame.samples, frame.sampleRate);
  const samples: number[] = [];
  for (let repeat = 0; repeat < 8; repeat += 1) for (const frame of selected) {
    const started = performance.now();
    detector(frame.samples, frame.sampleRate);
    samples.push(performance.now() - started);
  }
  return { warmupCalls: selected.length * 2, measuredCalls: samples.length, medianMs: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), maxMs: Math.max(...samples) };
}
