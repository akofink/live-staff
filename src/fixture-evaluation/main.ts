import { evaluateFixturePcm, type FixtureEvaluation } from "./evaluation";
import { pianoFixtures, type PianoFixture } from "./fixtures";
import "./styles.css";

const evaluateButton = document.querySelector<HTMLButtonElement>("#evaluate")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const results = document.querySelector<HTMLDivElement>("#results")!;

function fixtureUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}tests/fixtures/piano-iphone-16-pro-macbook-air-m2/${fileName}`;
}

function renderResult(fixture: PianoFixture, evaluation: FixtureEvaluation): void {
  const item = document.createElement("article");
  const estimates = evaluation.estimates
    .map(
      (estimate) =>
        `${estimate.detectedPitch} (${estimate.frequencyHz.toFixed(1)} Hz, ${estimate.confidence.toFixed(2)}, ${estimate.cents >= 0 ? "+" : ""}${estimate.cents} cents)`,
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

async function evaluateFixture(context: AudioContext, fixture: PianoFixture): Promise<void> {
  const response = await fetch(fixtureUrl(fixture.fileName));
  if (!response.ok) {
    throw new Error(`${fixture.fileName}: ${response.status} ${response.statusText}`);
  }

  const audio = await context.decodeAudioData(await response.arrayBuffer());
  renderResult(fixture, evaluateFixturePcm(audio.getChannelData(0), audio.sampleRate, fixture.expectedMidi));
}

evaluateButton.addEventListener("click", async () => {
  evaluateButton.disabled = true;
  results.replaceChildren();
  const context = new AudioContext();

  try {
    for (const [index, fixture] of pianoFixtures.entries()) {
      status.textContent = `Decoding ${fixture.fileName} (${index + 1} of ${pianoFixtures.length}).`;
      await evaluateFixture(context, fixture);
    }
    status.textContent = "Evaluation complete. Review all observed estimates, including mismatches and missing estimates.";
  } catch (error) {
    status.textContent = `Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  } finally {
    await context.close();
    evaluateButton.disabled = false;
  }
});
