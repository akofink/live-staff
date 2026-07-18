import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

interface FixtureEvaluationReport {
  readonly status: "complete" | "failed";
  readonly error?: string;
  readonly fixtures: readonly {
    readonly fileName: string;
    readonly expectedPitch: string;
    readonly expectedMidi: number;
    readonly evaluation: {
      readonly evaluatedWindows: number;
      readonly matchingWindows: number;
      readonly octaveErrors: number;
      readonly windows: readonly {
        readonly estimate: null | { readonly matchesExpectedPitch: boolean; readonly octaveError: boolean };
      }[];
    };
  }[];
  readonly policy: {
    readonly supportedRangeHz: { readonly minimum: number; readonly maximum: number };
    readonly recordedPianoRegression: {
      readonly expectedInRangeFixtures: number;
      readonly minimumMatchingFixtures: number;
      readonly minimumEstimates: number;
      readonly maximumOctaveErrors: number;
    };
  };
}

declare global {
  interface Window {
    fixtureEvaluationReport?: FixtureEvaluationReport;
  }
}

test("decodes every local M4A fixture and records the evaluator output", async ({ page }, testInfo) => {
  const runtimeErrors: string[] = [];
  const requestUrls: URL[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(new URL(request.url())));

  await page.goto("/fixture-evaluation.html");
  await expect(page.getByRole("heading", { name: "Piano fixture evaluation" })).toBeVisible();
  await page.getByRole("button", { name: "Evaluate fixtures" }).click();
  await expect.poll(() => page.evaluate(() => window.fixtureEvaluationReport)).toBeTruthy();

  const report = await page.evaluate(() => window.fixtureEvaluationReport) as FixtureEvaluationReport;
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/fixture-evaluation.json", `${JSON.stringify(report, null, 2)}\n`);
  await testInfo.attach("fixture-evaluation.json", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });

  expect(runtimeErrors).toEqual([]);
  expect(
    requestUrls.every(
      ({ hostname, port }) =>
        (hostname === "127.0.0.1" || hostname === "localhost") &&
        port === (process.env.PLAYWRIGHT_PORT ?? "4173"),
    ),
  ).toBe(true);
  expect(report.status, report.error).toBe("complete");
  expect(report.fixtures).toHaveLength(12);
  expect(report.fixtures.every((fixture) => fixture.evaluation.evaluatedWindows > 0)).toBe(true);
  expect(report.fixtures.every((fixture) => fixture.evaluation.windows.length === fixture.evaluation.evaluatedWindows)).toBe(true);

  const inRange = report.fixtures.filter((fixture) => {
    const expectedHz = 440 * 2 ** ((fixture.expectedMidi - 69) / 12);
    return expectedHz >= report.policy.supportedRangeHz.minimum && expectedHz <= report.policy.supportedRangeHz.maximum;
  });
  const matchingFixtures = inRange.filter((fixture) => fixture.evaluation.matchingWindows > 0);
  const estimates = inRange.flatMap((fixture) => fixture.evaluation.windows.flatMap((window) => window.estimate ? [window.estimate] : []));
  const octaveErrors = estimates.filter((estimate) => estimate.octaveError);

  expect(inRange).toHaveLength(report.policy.recordedPianoRegression.expectedInRangeFixtures);
  expect(matchingFixtures.length).toBeGreaterThanOrEqual(report.policy.recordedPianoRegression.minimumMatchingFixtures);
  expect(estimates.length).toBeGreaterThanOrEqual(report.policy.recordedPianoRegression.minimumEstimates);
  expect(octaveErrors.length).toBeLessThanOrEqual(report.policy.recordedPianoRegression.maximumOctaveErrors);
});
