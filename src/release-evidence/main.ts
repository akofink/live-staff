import { evidenceChecks, isEvidenceReportShape, reportToMarkdown, resultValues, validateEvidenceReport, type EvidenceReport } from "./report";
import "./styles.css";

const storageKey = "live-staff-attended-evidence-v1";
const buildSha = import.meta.env.VITE_BUILD_SHA || "unrecorded";
const fieldDefinitions = [
  ["buildSha", "Build SHA"], ["appUrl", "App URL"], ["device", "Device model"],
  ["os", "OS and version"], ["browser", "Browser"], ["browserVersion", "Browser version"], ["inputRoute", "Input route"],
  ["viewport", "CSS viewport/display mode"], ["assistiveTechnology", "Assistive technology and version"],
  ["durationMinutes", "Sustained duration (minutes)"], ["batteryStart", "Battery start"], ["batteryEnd", "Battery end"],
  ["thermalObservation", "Thermal/memory observation"],
] as const;

function emptyReport(): EvidenceReport {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1, startedAt: now, updatedAt: now, buildSha, appUrl: "https://live-staff.akofink.com/",
    device: "", os: "", browser: "", browserVersion: "", inputRoute: "", viewport: "", assistiveTechnology: "",
    durationMinutes: "", batteryStart: "", batteryEnd: "", thermalObservation: "",
    checks: Object.fromEntries(evidenceChecks.map(({ id }) => [id, { result: "not-run", attended: false, notes: "" }])),
  };
}

function loadReport(): EvidenceReport {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return isEvidenceReportShape(value) ? value : emptyReport();
  } catch {
    return emptyReport();
  }
}

let report = loadReport();
const status = document.querySelector<HTMLParagraphElement>("#save-status")!;
const sessionFields = document.querySelector<HTMLDivElement>("#session-fields")!;
const checksContainer = document.querySelector<HTMLDivElement>("#checks")!;

function save(): void {
  report = { ...report, updatedAt: new Date().toISOString() };
  localStorage.setItem(storageKey, JSON.stringify(report));
  status.textContent = `Saved locally at ${new Date(report.updatedAt).toLocaleTimeString()}. Nothing was uploaded.`;
}

for (const [name, labelText] of fieldDefinitions) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.name = name;
  input.value = report[name];
  input.addEventListener("input", () => {
    report = { ...report, [name]: input.value };
    save();
  });
  label.append(input);
  sessionFields.append(label);
}

for (const check of evidenceChecks) {
  const article = document.createElement("fieldset");
  const heading = document.createElement("legend");
  heading.textContent = `${check.area}: ${check.id.replaceAll("-", " ")}`;
  const instruction = document.createElement("p");
  instruction.textContent = check.instruction;
  const selectLabel = document.createElement("label");
  selectLabel.textContent = `${check.area} attended result`;
  const select = document.createElement("select");
  select.name = `${check.id}-result`;
  for (const value of resultValues) select.add(new Option(value, value));
  select.value = report.checks[check.id].result;
  const attendedLabel = document.createElement("label");
  attendedLabel.textContent = "I attended this check and recorded every unavailable scenario";
  const attended = document.createElement("input");
  attended.type = "checkbox";
  attended.name = `${check.id}-attended`;
  attended.checked = report.checks[check.id].attended;
  attendedLabel.prepend(attended);
  const notesLabel = document.createElement("label");
  notesLabel.textContent = `${check.area} observations and limitations`;
  const notes = document.createElement("textarea");
  notes.name = `${check.id}-notes`;
  notes.rows = 3;
  notes.value = report.checks[check.id].notes;
  const update = () => {
    report = { ...report, checks: { ...report.checks, [check.id]: { result: select.value as typeof resultValues[number], attended: attended.checked, notes: notes.value } } };
    save();
  };
  select.addEventListener("change", update);
  attended.addEventListener("change", update);
  notes.addEventListener("input", update);
  selectLabel.append(select);
  notesLabel.append(notes);
  article.append(heading, instruction, attendedLabel, selectLabel, notesLabel);
  checksContainer.append(article);
}

function download(contents: string, extension: string, type: string): void {
  if (!validateEvidenceReport(report)) {
    status.textContent = "Report validation failed. Clear the local report and try again.";
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([contents], { type }));
  link.download = `live-staff-evidence-${report.buildSha.slice(0, 12) || "unrecorded"}.${extension}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelector<HTMLButtonElement>("#open-app")!.addEventListener("click", () => {
  try {
    const url = new URL(report.appUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    status.textContent = "Enter a valid HTTP or HTTPS app URL before opening it.";
  }
});
document.querySelector<HTMLButtonElement>("#export-json")!.addEventListener("click", () => download(`${JSON.stringify(report, null, 2)}\n`, "json", "application/json"));
document.querySelector<HTMLButtonElement>("#export-markdown")!.addEventListener("click", () => download(reportToMarkdown(report), "md", "text/markdown"));
document.querySelector<HTMLButtonElement>("#clear")!.addEventListener("click", () => {
  if (!window.confirm("Delete this browser's locally stored evidence report? Export it first if it must be retained.")) return;
  localStorage.removeItem(storageKey);
  window.location.reload();
});
