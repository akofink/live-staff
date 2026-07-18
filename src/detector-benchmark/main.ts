import { pianoFixtures } from "../fixture-evaluation/fixtures";
import { analysisFrameStarts } from "../fixture-evaluation/evaluation";
import { benchmarkDetectors, cpuTiming, detectorAllocationInventory, establishedScenarioResults, evaluateFrames, recordedFrameStarts, syntheticCorpus, type LabeledFrame } from "./benchmark";

declare global { interface Window { detectorBenchmarkReport?: unknown } }

const fixtureRoot = "/tests/fixtures/piano-iphone-16-pro-macbook-air-m2";

async function recordedFrames(context: AudioContext) {
  const baseline: LabeledFrame[] = [];
  const expanded: LabeledFrame[] = [];
  for (const fixture of pianoFixtures) {
    const response = await fetch(`${fixtureRoot}/${fixture.fileName}`);
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    const samples = buffer.getChannelData(0);
    for (const start of analysisFrameStarts(samples.length, buffer.sampleRate)) baseline.push({
      id: `${fixture.fileName}:baseline-stable:4096:${start}`, samples: samples.slice(start, start + 4_096),
      sampleRate: buffer.sampleRate, expectedMidi: fixture.expectedMidi,
    });
    for (const frameLength of [2_048, 4_096]) {
      for (const { label, start } of recordedFrameStarts(samples, buffer.sampleRate, frameLength)) {
        expanded.push({
          id: `${fixture.fileName}:${label}:${frameLength}:${start}`,
          samples: samples.slice(start, start + frameLength), sampleRate: buffer.sampleRate, expectedMidi: fixture.expectedMidi,
        });
      }
    }
  }
  return { baseline, expanded };
}

function aggregateExpanded(frames: readonly LabeledFrame[], detector: (typeof benchmarkDetectors)[string]) {
  const contracts = ["dense-onset", "live-overlap", "stable-sustain"];
  return Object.fromEntries(contracts.map((contract) => [contract, Object.fromEntries([2_048, 4_096].map((frameSize) => [frameSize,
    evaluateFrames(frames.filter((frame) => frame.id.includes(`:${contract}:${frameSize}:`)), detector)]))]));
}

function isPolicyInRange(frame: LabeledFrame) {
  const frequencyHz = 440 * 2 ** (((frame.expectedMidi ?? 0) - 69) / 12);
  return frequencyHz >= 58.27 && frequencyHz <= 987.77;
}

document.querySelector("#run")?.addEventListener("click", async () => {
  const status = document.querySelector("#status")!;
  status.textContent = "Running...";
  try {
    const context = new AudioContext();
    const recorded = await recordedFrames(context);
    const synthetic = syntheticCorpus();
    const results: Record<string, unknown> = {};
    for (const [name, detector] of Object.entries(benchmarkDetectors)) {
      results[name] = { scenarios: establishedScenarioResults(detector),
        recorded: { baselineCompatible: { allFixtures: evaluateFrames(recorded.baseline, detector),
          policyInRange: evaluateFrames(recorded.baseline.filter(isPolicyInRange), detector) }, expanded: aggregateExpanded(recorded.expanded, detector) },
        cpu: cpuTiming(detector, synthetic), allocations: detectorAllocationInventory(name) };
    }
    await context.close();
    window.detectorBenchmarkReport = { schemaVersion: 1, environment: { userAgent: navigator.userAgent },
      methodology: { offline: true, deterministicSyntheticSeeded: true, recordedLabelsUseCatalogExpectedMidi: true, researchOnly: true },
      corpus: { syntheticWindows: synthetic.length, baselineCompatibleWindows: recorded.baseline.length, expandedRecordedWindows: recorded.expanded.length,
        fixtures: pianoFixtures.length, recordedFrameSizes: [2_048, 4_096], expandedContracts: ["dense-onset", "live-overlap", "stable-sustain"] }, results };
    status.textContent = "Complete.";
  } catch (error) {
    window.detectorBenchmarkReport = { schemaVersion: 1, error: error instanceof Error ? error.message : String(error) };
    status.textContent = "Failed.";
  }
});
