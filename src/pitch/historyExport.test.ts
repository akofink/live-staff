import { describe, expect, it } from "vitest";
import { instruments } from "../instruments/instruments";
import {
  buildHistoryExport,
  formatHistoryCsv,
  formatHistoryExport,
  formatHistoryJson,
  formatHistoryText,
  historyExportDisclaimer,
  historyExportFileName,
  historyExportMediaType,
  type HistoryExportContext,
} from "./historyExport";
import type { PitchHistoryEvent } from "./pitchHistory";

function instrument(id: string) {
  const definition = instruments.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Missing instrument: ${id}`);
  return definition;
}

function context(overrides: Partial<HistoryExportContext> = {}): HistoryExportContext {
  return {
    events: [
      { concertMidi: 60, onsetMs: 100, endMs: 500 },
      { concertMidi: 62, onsetMs: 500, endMs: undefined },
    ],
    nowMs: 700,
    instrumentId: "concert",
    instrument: instrument("concert-pitch"),
    pitchDisplay: "concert",
    roomCalibrationState: "idle",
    filtersBypassed: false,
    inputFilters: [],
    ...overrides,
  };
}

describe("buildHistoryExport", () => {
  it("exports committed history events with equal-tempered concert frequency", () => {
    const document = buildHistoryExport(context());

    expect(document.events).toEqual([
      {
        concertMidi: 60,
        concertPitch: "C4",
        writtenMidi: 60,
        writtenPitch: "C4",
        frequencyHz: 261.625565,
        cents: 0,
        onsetMs: 100,
        endMs: 500,
        durationMs: 400,
        sounding: false,
      },
      {
        concertMidi: 62,
        concertPitch: "D4",
        writtenMidi: 62,
        writtenPitch: "D4",
        frequencyHz: 293.664768,
        cents: 0,
        onsetMs: 500,
        endMs: undefined,
        durationMs: 200,
        sounding: true,
      },
    ]);
    expect(document.timing).toBe("observed-elapsed-ms");
    expect(document.disclaimer).toBe(historyExportDisclaimer);
  });

  it("recomputes written pitch from the current instrument without changing concert MIDI", () => {
    const events: readonly PitchHistoryEvent[] = [{ concertMidi: 60, onsetMs: 0, endMs: 200 }];
    const concert = buildHistoryExport(context({ events }));
    const trumpet = buildHistoryExport(context({
      events,
      instrumentId: "b-flat-trumpet",
      instrument: instrument("bb-trumpet"),
      pitchDisplay: "written",
    }));

    expect(concert.events[0]).toMatchObject({ concertMidi: 60, writtenMidi: 60, writtenPitch: "C4" });
    expect(trumpet.events[0]).toMatchObject({
      concertMidi: 60,
      writtenMidi: 62,
      writtenPitch: "D4",
    });
    expect(trumpet.pitchDisplay).toBe("written");
  });

  it("uses observed elapsed time for open events and never invents meter fields", () => {
    const json = formatHistoryJson(buildHistoryExport(context()));
    expect(json).toContain("\"durationMs\": 200");
    expect(json).not.toMatch(/"(?:tempo|bpm|beatsPerMinute|timeSignature|quarterNote)"/);
  });
});

describe("history export formats", () => {
  it("escapes CSV fields that contain commas, quotes, or newlines", () => {
    const document = buildHistoryExport(context({
      instrumentId: "custom,id",
      instrument: { ...instrument("bb-trumpet"), name: "Trumpet \"Bb\", practice" },
      inputFilters: [{ id: "hum,60", type: "notch", enabled: true, frequencyHz: 60, q: 20, attenuationDb: 18 }],
    }));
    const csv = formatHistoryCsv(document);
    const [, row] = csv.trimEnd().split("\n");

    expect(csv.startsWith("concert_midi,concert_pitch,")).toBe(true);
    expect(row).toContain("\"custom,id\"");
    expect(row).toContain("\"Trumpet \"\"Bb\"\", practice\"");
    expect(row).toContain("\"[{");
    expect(formatHistoryCsv(document)).toBe(csv);
  });

  it("serializes JSON with null end times for sounding events", () => {
    const json = formatHistoryJson(buildHistoryExport(context()));
    expect(json).toContain("\"endMs\": null");
    expect(json).toContain("\"schemaVersion\": 1");
    expect(formatHistoryJson(buildHistoryExport(context()))).toBe(json);
  });

  it("writes a one-line-per-event plain-text report with the timing disclaimer", () => {
    const text = formatHistoryText(buildHistoryExport(context({
      instrument: { ...instrument("concert-pitch"), name: "Concert\npitch" },
    })));
    expect(text).toContain(historyExportDisclaimer);
    expect(text).toContain("Instrument: Concert pitch (concert)");
    expect(text).toContain("1. concert MIDI 60 (C4); written MIDI 60 (C4); 261.625565 Hz; 0 cents; onset 100 ms; end 500 ms; duration 400 ms");
    expect(text).toContain("2. concert MIDI 62 (D4); written MIDI 62 (D4); 293.664768 Hz; 0 cents; onset 500 ms; sounding; duration 200 ms");
    expect(text).not.toContain("\n#");
  });

  it("keeps empty history as headers or an explicit empty statement", () => {
    const document = buildHistoryExport(context({ events: [] }));
    expect(formatHistoryCsv(document)).toBe(`${[
      "concert_midi,concert_pitch,written_midi,written_pitch,frequency_hz,cents,onset_ms,end_ms,duration_ms,sounding,instrument_id,instrument_name,pitch_display,a4_hz,room_calibration,filters_bypassed,input_filters",
    ].join("\n")}\n`);
    expect(formatHistoryText(document)).toContain("No committed stable notes.");
    expect(JSON.parse(formatHistoryJson(document)).events).toEqual([]);
  });

  it("selects deterministic file names and media types", () => {
    expect(historyExportFileName("csv")).toBe("live-staff-pitch-history.csv");
    expect(historyExportMediaType("json")).toBe("application/json");
    expect(formatHistoryExport(buildHistoryExport(context()), "txt")).toContain("Events, oldest to newest:");
  });
});
