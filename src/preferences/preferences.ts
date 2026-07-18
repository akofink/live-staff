import { isInputFilterBand, maximumFilterBands, type InputFilterBand } from "../audio/inputFilterChain";

export const instrumentOptions = [
  { id: "concert", label: "Concert pitch", definitionId: "concert-pitch" },
  { id: "b-flat-clarinet", label: "B-flat clarinet", definitionId: "bb-clarinet" },
  { id: "b-flat-trumpet", label: "B-flat trumpet", definitionId: "bb-trumpet" },
  { id: "e-flat-alto-saxophone", label: "E-flat alto saxophone", definitionId: "eb-alto-saxophone" },
  { id: "f-horn", label: "F horn", definitionId: "f-horn" },
] as const;

export type InstrumentId = (typeof instrumentOptions)[number]["id"];
export type MainsHumFrequency = "off" | 50 | 60;

export interface Preferences {
  readonly instrumentId: InstrumentId;
  readonly mainsHumFrequency: MainsHumFrequency;
  readonly inputFilters: readonly InputFilterBand[];
}

export const defaultPreferences: Preferences = {
  instrumentId: "concert",
  mainsHumFrequency: "off",
  inputFilters: [],
};

export function isInstrumentId(value: unknown): value is InstrumentId {
  return instrumentOptions.some((instrument) => instrument.id === value);
}

export function isLegacyPreferences(
  value: unknown,
): value is {
  readonly instrumentId: InstrumentId;
  readonly pitchDisplay: "concert" | "written";
  readonly mainsHumFrequency?: MainsHumFrequency;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isInstrumentId(candidate.instrumentId) &&
    (candidate.pitchDisplay === "concert" || candidate.pitchDisplay === "written") &&
    (candidate.mainsHumFrequency === undefined ||
      candidate.mainsHumFrequency === "off" ||
      candidate.mainsHumFrequency === 50 ||
      candidate.mainsHumFrequency === 60)
  );
}

export function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isInstrumentId(candidate.instrumentId) &&
    (candidate.mainsHumFrequency === "off" ||
      candidate.mainsHumFrequency === 50 ||
      candidate.mainsHumFrequency === 60) &&
    Array.isArray(candidate.inputFilters) &&
    candidate.inputFilters.length <= maximumFilterBands &&
    candidate.inputFilters.every(isInputFilterBand)
  );
}
