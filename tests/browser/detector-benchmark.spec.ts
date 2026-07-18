import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

test("records deterministic offline detector evidence", async ({ page }, testInfo) => {
  const requests: URL[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url())));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/detector-benchmark.html");
  await page.getByRole("button", { name: "Run benchmark" }).click();
  await expect(page.getByRole("status")).toHaveText("Complete.", { timeout: 120_000 });
  const report = await page.evaluate(() => window.detectorBenchmarkReport) as Record<string, unknown>;
  Object.assign(report, { bundleCost: JSON.parse(await readFile("test-results/detector-bundle-cost.json", "utf8")) });
  await mkdir("test-results", { recursive: true });
  const body = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile("test-results/detector-benchmark.json", body);
  await testInfo.attach("detector-benchmark.json", { body, contentType: "application/json" });
  expect(errors).toEqual([]);
  expect(requests.every(({ hostname }) => hostname === "127.0.0.1" || hostname === "localhost")).toBe(true);
  expect((report as { corpus: { fixtures: number } }).corpus.fixtures).toBe(12);
  const results = (report as { results: Record<string, { recorded: { baselineCompatible: { policyInRange: { matchingGroups: string[]; emitted: number; octaveErrors: number } } } }> }).results;
  expect(results.control.recorded.baselineCompatible.policyInRange).toMatchObject({ emitted: 31, octaveErrors: 20 });
  expect(results.control.recorded.baselineCompatible.policyInRange.matchingGroups).toHaveLength(3);
  expect(results.fundamentalAware.recorded.baselineCompatible.policyInRange).toMatchObject({ emitted: 31, octaveErrors: 20 });
  expect(results.fundamentalAware.recorded.baselineCompatible.policyInRange.matchingGroups).toHaveLength(3);
  expect(results.multiPeriod.recorded.baselineCompatible.policyInRange).toMatchObject({ emitted: 25, octaveErrors: 19 });
  expect(results.combProjection.recorded.baselineCompatible.policyInRange).toMatchObject({ emitted: 26, octaveErrors: 19 });
  expect(results.landmarkHistogram.recorded.baselineCompatible.policyInRange).toMatchObject({ emitted: 0, octaveErrors: 0 });
});
