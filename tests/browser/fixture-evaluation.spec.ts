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
      readonly estimates: readonly unknown[];
    };
  }[];
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
      ({ hostname, port }) => (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173",
    ),
  ).toBe(true);
  expect(report.status, report.error).toBe("complete");
  expect(report.fixtures).toHaveLength(12);
  expect(report.fixtures.every((fixture) => fixture.evaluation.evaluatedWindows > 0)).toBe(true);
});
