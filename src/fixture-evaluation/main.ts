import { evaluateFixturePcm, type FixtureEvaluation } from "./evaluation";
import { pianoFixtures, type PianoFixture } from "./fixtures";
import { detectorEvidencePolicy } from "./evidencePolicy";
import "./styles.css";

const evaluateButton = document.querySelector<HTMLButtonElement>("#evaluate")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const results = document.querySelector<HTMLDivElement>("#results")!;

interface FixtureResult {
  readonly fileName: string;
  readonly expectedPitch: string;
  readonly expectedMidi: number;
  readonly evaluation: FixtureEvaluation;
}

interface FixtureEvaluationReport {
  readonly status: "complete" | "failed";
  readonly fixtures: readonly FixtureResult[];
  readonly policy: typeof detectorEvidencePolicy;
  readonly error?: string;
}

declare global {
  interface Window {
    fixtureEvaluationReport?: FixtureEvaluationReport;
  }
}
function fixtureUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}tests/fixtures/piano-iphone-16-pro-macbook-air-m2/${fileName}`;
}

function renderResult(fixture: PianoFixture, evaluation: FixtureEvaluation): void {
  const item = document.createElement("article");
  const estimates = evaluation.windows
    .filter((window) => window.estimate !== null)
    .map(
      ({ estimate }) => estimate &&
        `${estimate.detectedPitch} (${estimate.frequencyHz.toFixed(1)} Hz, ${estimate.confidence.toFixed(2)}, ${estimate.centsError >= 0 ? "+" : ""}${estimate.centsError} cents from expected)`,
    )
    .join("; ");

  item.innerHTML = `
    <h2>${fixture.fileName}</h2>
    <dl>
      <div><dt>Expected</dt><dd>${fixture.expectedPitch} (MIDI ${fixture.expectedMidi})</dd></div>
      <div><dt>Matching estimates</dt><dd>${evaluation.matchingWindows} of ${evaluation.evaluatedWindows} sampled windows</dd></div>
      <div><dt>Observed</dt><dd>${estimates || "No estimate"}</dd></div>
    </dl>
  `;
  results.append(item);
}

async function evaluateFixture(context: AudioContext, fixture: PianoFixture): Promise<FixtureResult> {
  const response = await fetch(fixtureUrl(fixture.fileName));
  if (!response.ok) {
    throw new Error(`${fixture.fileName}: ${response.status} ${response.statusText}`);
  }

  const audio = await context.decodeAudioData(await response.arrayBuffer());
  const evaluation = evaluateFixturePcm(audio.getChannelData(0), audio.sampleRate, fixture.expectedMidi);
  renderResult(fixture, evaluation);
  return { ...fixture, evaluation };
}

function publishReport(report: FixtureEvaluationReport): void {
  window.fixtureEvaluationReport = report;
  window.dispatchEvent(new CustomEvent("fixture-evaluation-complete", { detail: report }));
}

evaluateButton.addEventListener("click", async () => {
  evaluateButton.disabled = true;
  results.replaceChildren();
  const fixtureResults: FixtureResult[] = [];
  let context: AudioContext | undefined;

  try {
    context = new AudioContext();
    for (const [index, fixture] of pianoFixtures.entries()) {
      status.textContent = `Decoding ${fixture.fileName} (${index + 1} of ${pianoFixtures.length}).`;
      fixtureResults.push(await evaluateFixture(context, fixture));
    }
    status.textContent = "Evaluation complete. Review all observed estimates, including mismatches and missing estimates.";
    publishReport({ status: "complete", fixtures: fixtureResults, policy: detectorEvidencePolicy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    status.textContent = `Evaluation failed: ${message}`;
    publishReport({ status: "failed", fixtures: fixtureResults, policy: detectorEvidencePolicy, error: message });
  } finally {
    await context?.close();
    evaluateButton.disabled = false;
  }
});
