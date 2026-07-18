export const resultValues = ["not-run", "pass", "fail", "blocked"] as const;
export type EvidenceResult = typeof resultValues[number];

export interface EvidenceCheck {
  readonly id: string;
  readonly area: string;
  readonly instruction: string;
}

export interface CheckResult {
  readonly result: EvidenceResult;
  readonly attended: boolean;
  readonly notes: string;
}

export interface EvidenceReport {
  readonly schemaVersion: 1;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly buildSha: string;
  readonly appUrl: string;
  readonly device: string;
  readonly os: string;
  readonly browser: string;
  readonly browserVersion: string;
  readonly inputRoute: string;
  readonly viewport: string;
  readonly assistiveTechnology: string;
  readonly durationMinutes: string;
  readonly batteryStart: string;
  readonly batteryEnd: string;
  readonly thermalObservation: string;
  readonly checks: Readonly<Record<string, CheckResult>>;
}

export const evidenceChecks: readonly EvidenceCheck[] = [
  { id: "layout", area: "Layout", instruction: "Inspect portrait and landscape at a CSS viewport of at least 320 px, then 200% zoom or the platform large-text setting. Confirm no required control, status, history, or staff alternative is clipped or obscured." },
  { id: "permission-start", area: "Microphone", instruction: "From an idle page, activate Start listening. Confirm this user action causes the only permission prompt and listening starts after permission is granted." },
  { id: "pitch-history", area: "Pitch and history", instruction: "Use a named live voice, instrument, or generated acoustic tone. Record expected and displayed notes in Notes, and confirm current note and recent history update together. Do not generalize accuracy beyond observations." },
  { id: "transposition", area: "Transposition", instruction: "Select B-flat trumpet while using the same concert source. Confirm the written note is one whole step above concert pitch and the pitch reference identifies the concert note." },
  { id: "calibration", area: "Calibration", instruction: "While listening in a quiet room, run room-noise calibration. Confirm understandable status, session-only behavior, and continued response to a louder pitched source." },
  { id: "filters", area: "Filters", instruction: "Add and edit a filter, compare enabled and bypassed behavior, reset it, and verify all controls remain operable without a pointer." },
  { id: "monitor", area: "Signal monitor", instruction: "Enable the opt-in waveform and spectrum monitor while listening, inspect it, then disable it. Confirm the app remains responsive and the diagnostic display stops immediately." },
  { id: "stop", area: "Microphone", instruction: "Stop listening and confirm the browser or operating-system microphone indicator clears." },
  { id: "background", area: "Lifecycle", instruction: "While listening, background or switch away from the browser, then return. Confirm the app explains the pause and one explicit action resumes without a duplicate permission request." },
  { id: "screen-lock", area: "Lifecycle", instruction: "While listening, lock and unlock the device. Record the resulting state and whether one clear recovery action works." },
  { id: "interruption", area: "Lifecycle", instruction: "Cause an available operating-system audio interruption, such as a call or another audio session. Record the resulting state and recovery behavior." },
  { id: "permission-revocation", area: "Lifecycle", instruction: "Revoke site microphone permission during or between sessions. Confirm the error and recovery guidance are accurate and no microphone remains active." },
  { id: "route-change", area: "Lifecycle", instruction: "Change among each available built-in, wired, Bluetooth, or external input route and remove an external input. Record unsupported scenarios as blocked, not passed." },
  { id: "keyboard", area: "Accessibility", instruction: "Navigate from page start without a pointer. Confirm logical focus order, visible focus, native names, units, values, disabled states, and disclosure states." },
  { id: "screen-reader", area: "Accessibility", instruction: "With the named VoiceOver or TalkBack configuration, confirm idle, permission, listening, silence or uncertain input, detected note, denial, device loss, and recovery messages are announced once and remain understandable. Confirm raw SVG is not read." },
  { id: "privacy-network", area: "Privacy", instruction: "Inspect the browser network log from before Start through Stop and local preference changes. Fail for any audio, detection, preference, profile, analytics, telemetry, or third-party executable request. Record request observations without private URLs or identifiers." },
  { id: "sustained", area: "Sustained performance", instruction: "Run at least 30 minutes with filters and monitor enabled. Record duration, battery start/end, thermal observation, memory when available, responsiveness, and any dropped or frozen display." },
] as const;

const textFields = ["startedAt", "updatedAt", "buildSha", "appUrl", "device", "os", "browser", "browserVersion", "inputRoute", "viewport", "assistiveTechnology", "durationMinutes", "batteryStart", "batteryEnd", "thermalObservation"] as const;
const requiredMetadata = ["buildSha", "appUrl", "device", "os", "browser", "browserVersion", "inputRoute", "viewport", "assistiveTechnology"] as const;

export function isEvidenceReportShape(value: unknown): value is EvidenceReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  if (report.schemaVersion !== 1 || !textFields.every((field) => typeof report[field] === "string")) return false;
  const expectedKeys = ["schemaVersion", ...textFields, "checks"];
  if (Object.keys(report).some((key) => !expectedKeys.includes(key))) return false;
  if (!report.checks || typeof report.checks !== "object" || Array.isArray(report.checks)) return false;
  const checks = report.checks as Record<string, unknown>;
  if (Object.keys(checks).length !== evidenceChecks.length) return false;
  return evidenceChecks.every(({ id }) => {
    const check = checks[id];
    if (!check || typeof check !== "object") return false;
    const result = (check as Record<string, unknown>).result;
    const notes = (check as Record<string, unknown>).notes;
    return resultValues.includes(result as EvidenceResult) && typeof notes === "string" && typeof (check as Record<string, unknown>).attended === "boolean";
  });
}

export function validateEvidenceReport(value: unknown): value is EvidenceReport {
  if (!isEvidenceReportShape(value)) return false;
  const report = value;
  if (!requiredMetadata.every((field) => report[field].trim().length > 0)) return false;
  if (!/^[a-fA-F0-9]{7,40}$/.test(report.buildSha)) return false;
  if (Number.isNaN(Date.parse(report.startedAt)) || Number.isNaN(Date.parse(report.updatedAt))) return false;
  try {
    const protocol = new URL(report.appUrl).protocol;
    if (protocol !== "http:" && protocol !== "https:") return false;
  } catch {
    return false;
  }
  if (!evidenceChecks.every(({ id }) => {
    const check = report.checks[id];
    return check.result === "not-run" ? !check.attended : check.attended && check.notes.trim().length > 0;
  })) return false;
  if (report.checks.sustained && report.checks.sustained.result === "pass") {
    if (Number(report.durationMinutes) < 30 || !(report.batteryStart as string).trim() || !(report.batteryEnd as string).trim() || !(report.thermalObservation as string).trim()) return false;
  }
  return true;
}

function markdownText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/([|`*_[\]()#!])/g, "\\$1").replaceAll("\r", " ").replaceAll("\n", " ");
}

export function reportToMarkdown(report: EvidenceReport): string {
  const rows = evidenceChecks.map((check) => {
    const observation = report.checks[check.id];
    return `| ${check.area} | ${markdownText(check.instruction)} | ${observation.attended ? "yes" : "no"} | ${observation.result} | ${markdownText(observation.notes)} |`;
  });
  return [
    "# Live Staff Attended Release Evidence",
    "",
    `- Build SHA: \`${markdownText(report.buildSha)}\``,
    `- App URL: ${markdownText(report.appUrl)}`,
    `- Started: ${markdownText(report.startedAt)}`,
    `- Updated: ${markdownText(report.updatedAt)}`,
    `- Device: ${markdownText(report.device)}`,
    `- OS: ${markdownText(report.os)}`,
    `- Browser: ${markdownText(report.browser)} ${markdownText(report.browserVersion)}`,
    `- Input route: ${markdownText(report.inputRoute)}`,
    `- Viewport: ${markdownText(report.viewport)}`,
    `- Assistive technology: ${markdownText(report.assistiveTechnology)}`,
    `- Sustained duration: ${markdownText(report.durationMinutes)} minutes`,
    `- Battery: ${markdownText(report.batteryStart)} to ${markdownText(report.batteryEnd)}`,
    `- Thermal observation: ${markdownText(report.thermalObservation)}`,
    "",
    "This report contains attended human observations. No result was inferred automatically.",
    "",
    "| Area | Instruction | Attended and unavailable scenarios recorded | Result | Notes and limitations |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}
