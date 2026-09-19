import { toDisplayPitch, type PitchRepresentation } from "../instruments/displayPitch";
import type { InstrumentDefinition } from "../instruments/instruments";
import { midiToFrequency } from "./frequency";
import { midiToNoteName } from "./note";
import { pitchHistoryMaxEvents, pitchHistoryWindowMs, type PitchHistoryEvent } from "./pitchHistory";

export const historyExportFormats = ["csv", "json", "txt"] as const;
export type HistoryExportFormat = (typeof historyExportFormats)[number];
export type RoomCalibrationState = "idle" | "calibrating" | "active";

export const historyExportDisclaimer =
  "Observed elapsed time of committed stable notes. Not meter, tempo, beat, or rhythmic transcription.";

export interface HistoryExportContext {
  readonly events: readonly PitchHistoryEvent[];
  readonly nowMs: number;
  readonly instrumentId: string;
  readonly instrument: InstrumentDefinition;
  readonly pitchDisplay: PitchRepresentation;
  readonly a4Hz?: number;
  readonly roomCalibrationState: RoomCalibrationState;
  readonly filtersBypassed: boolean;
  readonly inputFilters: readonly unknown[];
}

export interface HistoryExportEvent {
  readonly concertMidi: number;
  readonly concertPitch: string;
  readonly writtenMidi: number;
  readonly writtenPitch: string;
  readonly frequencyHz: number;
  readonly cents: number;
  readonly onsetMs: number;
  readonly endMs: number | undefined;
  readonly durationMs: number;
  readonly sounding: boolean;
}

export interface HistoryExportDocument {
  readonly schemaVersion: 1;
  readonly kind: "live-staff-stabilized-pitch-history";
  readonly timing: "observed-elapsed-ms";
  readonly a4Hz: number;
  readonly instrumentId: string;
  readonly instrumentName: string;
  readonly writtenToConcertSemitones: number;
  readonly pitchDisplay: PitchRepresentation;
  readonly roomCalibrationState: RoomCalibrationState;
  readonly filtersBypassed: boolean;
  readonly inputFilters: readonly unknown[];
  readonly historyWindowMs: number;
  readonly historyMaxEvents: number;
  readonly disclaimer: string;
  readonly events: readonly HistoryExportEvent[];
}

const csvColumns = [
  "concert_midi",
  "concert_pitch",
  "written_midi",
  "written_pitch",
  "frequency_hz",
  "cents",
  "onset_ms",
  "end_ms",
  "duration_ms",
  "sounding",
  "instrument_id",
  "instrument_name",
  "pitch_display",
  "a4_hz",
  "room_calibration",
  "filters_bypassed",
  "input_filters",
] as const;

function quantizeHz(frequencyHz: number): number {
  return Math.round(frequencyHz * 1e6) / 1e6;
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

function toExportEvent(
  event: PitchHistoryEvent,
  context: HistoryExportContext,
  a4Hz: number,
): HistoryExportEvent {
  const written = toDisplayPitch(event.concertMidi, "written", context.instrument);
  const sounding = event.endMs === undefined;
  const endMs = sounding ? undefined : event.endMs;
  return {
    concertMidi: event.concertMidi,
    concertPitch: midiToNoteName(event.concertMidi),
    writtenMidi: written.midi,
    writtenPitch: written.name,
    frequencyHz: quantizeHz(midiToFrequency(event.concertMidi, a4Hz)),
    cents: 0,
    onsetMs: event.onsetMs,
    endMs,
    durationMs: Math.max(0, (endMs ?? context.nowMs) - event.onsetMs),
    sounding,
  };
}

export function buildHistoryExport(context: HistoryExportContext): HistoryExportDocument {
  const a4Hz = context.a4Hz ?? 440;
  return {
    schemaVersion: 1,
    kind: "live-staff-stabilized-pitch-history",
    timing: "observed-elapsed-ms",
    a4Hz,
    instrumentId: context.instrumentId,
    instrumentName: context.instrument.name,
    writtenToConcertSemitones: context.instrument.writtenToConcertSemitones,
    pitchDisplay: context.pitchDisplay,
    roomCalibrationState: context.roomCalibrationState,
    filtersBypassed: context.filtersBypassed,
    inputFilters: context.inputFilters,
    historyWindowMs: pitchHistoryWindowMs,
    historyMaxEvents: pitchHistoryMaxEvents,
    disclaimer: historyExportDisclaimer,
    events: context.events.map((event) => toExportEvent(event, context, a4Hz)),
  };
}

export function formatHistoryCsv(document: HistoryExportDocument): string {
  const filterJson = JSON.stringify(document.inputFilters);
  const rows = [
    csvColumns.join(","),
    ...document.events.map((event) =>
      [
        String(event.concertMidi),
        event.concertPitch,
        String(event.writtenMidi),
        event.writtenPitch,
        String(event.frequencyHz),
        String(event.cents),
        String(event.onsetMs),
        event.endMs === undefined ? "" : String(event.endMs),
        String(event.durationMs),
        event.sounding ? "true" : "false",
        document.instrumentId,
        document.instrumentName,
        document.pitchDisplay,
        String(document.a4Hz),
        document.roomCalibrationState,
        document.filtersBypassed ? "true" : "false",
        filterJson,
      ]
        .map(csvField)
        .join(","),
    ),
  ];
  return `${rows.join("\n")}\n`;
}

export function formatHistoryJson(document: HistoryExportDocument): string {
  return `${JSON.stringify(
    {
      ...document,
      events: document.events.map((event) => ({
        ...event,
        endMs: event.endMs ?? null,
      })),
    },
    null,
    2,
  )}\n`;
}

export function formatHistoryText(document: HistoryExportDocument): string {
  const filters = oneLine(JSON.stringify(document.inputFilters));
  const header = [
    "Live Staff stabilized pitch-event history",
    "",
    `Timing: ${historyExportDisclaimer}`,
    `A4: ${document.a4Hz} Hz`,
    `Instrument: ${oneLine(document.instrumentName)} (${oneLine(document.instrumentId)})`,
    `Written-to-concert semitones: ${document.writtenToConcertSemitones}`,
    `Pitch display: ${document.pitchDisplay}`,
    `Room calibration: ${document.roomCalibrationState}`,
    `Filters bypassed: ${document.filtersBypassed ? "yes" : "no"}`,
    `Input filters: ${filters}`,
    `History bounds: ${document.historyWindowMs} ms, ${document.historyMaxEvents} events`,
    "",
  ];
  const events = document.events.length === 0
    ? ["No committed stable notes."]
    : [
        "Events, oldest to newest:",
        ...document.events.map((event, index) => {
          const end = event.sounding ? "sounding" : `end ${event.endMs} ms`;
          return `${index + 1}. concert MIDI ${event.concertMidi} (${event.concertPitch}); written MIDI ${event.writtenMidi} (${event.writtenPitch}); ${event.frequencyHz} Hz; ${event.cents} cents; onset ${event.onsetMs} ms; ${end}; duration ${event.durationMs} ms`;
        }),
      ];
  return `${[...header, ...events].join("\n")}\n`;
}

export function formatHistoryExport(document: HistoryExportDocument, format: HistoryExportFormat): string {
  if (format === "csv") return formatHistoryCsv(document);
  if (format === "json") return formatHistoryJson(document);
  return formatHistoryText(document);
}

export function historyExportFileName(format: HistoryExportFormat): string {
  return `live-staff-pitch-history.${format}`;
}

export function historyExportMediaType(format: HistoryExportFormat): string {
  if (format === "csv") return "text/csv";
  if (format === "json") return "application/json";
  return "text/plain";
}
