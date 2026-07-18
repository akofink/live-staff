import { describe, expect, it } from "vitest";
import { evidenceChecks, reportToMarkdown, validateEvidenceReport, type EvidenceReport } from "./report";

function report(): EvidenceReport {
  return {
    schemaVersion: 1,
    startedAt: "2026-07-18T12:00:00.000Z",
    updatedAt: "2026-07-18T12:30:00.000Z",
    buildSha: "abc1234",
    appUrl: "https://example.test/",
    device: "Phone",
    os: "OS 1",
    browser: "Browser",
    browserVersion: "2",
    inputRoute: "Built-in microphone",
    viewport: "390x844 CSS px",
    assistiveTechnology: "VoiceOver",
    durationMinutes: "30",
    batteryStart: "90%",
    batteryEnd: "82%",
    thermalObservation: "Warm, no warning",
    checks: Object.fromEntries(evidenceChecks.map(({ id }) => [id, { result: "not-run", attended: false, notes: "" }])),
  };
}

describe("attended evidence report", () => {
  it("accepts a complete versioned report and rejects fabricated or incomplete result shapes", () => {
    expect(validateEvidenceReport(report())).toBe(true);
    expect(validateEvidenceReport({ ...report(), checks: {} })).toBe(false);
    expect(validateEvidenceReport({ ...report(), checks: { ...report().checks, layout: { result: "automatic-pass", attended: true, notes: "Observed" } } })).toBe(false);
    expect(validateEvidenceReport({ ...report(), checks: { ...report().checks, layout: { result: "pass", attended: false, notes: "Observed" } } })).toBe(false);
    expect(validateEvidenceReport({ ...report(), appUrl: "javascript:alert(1)" })).toBe(false);
  });

  it("exports deterministic Markdown with limitations and escaped table content", () => {
    const value = report();
    const changed = { ...value, checks: { ...value.checks, layout: { result: "blocked" as const, attended: true, notes: "No device | unavailable\nRetest required" } } };
    const markdown = reportToMarkdown(changed);

    expect(markdown).toContain("No device \\| unavailable Retest required");
    expect(markdown).toContain("No result was inferred automatically.");
    expect(markdown.match(/\| blocked \|/g)).toHaveLength(1);
  });

  it("prevents entered metadata from creating Markdown structure", () => {
    const markdown = reportToMarkdown({ ...report(), device: "Phone\n\n# False claim ![pixel](https://example.test) <script>" });

    expect(markdown).not.toContain("\n# False claim");
    expect(markdown).not.toContain("![pixel](https://example.test)");
    expect(markdown).toContain("&lt;script&gt;");
  });
});
