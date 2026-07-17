export const instrumentOptions = [
  { id: "concert", label: "Concert pitch", definitionId: "concert-pitch" },
  { id: "b-flat-clarinet", label: "B-flat clarinet", definitionId: "bb-clarinet" },
  { id: "b-flat-trumpet", label: "B-flat trumpet", definitionId: "bb-trumpet" },
  { id: "e-flat-alto-saxophone", label: "E-flat alto saxophone", definitionId: "eb-alto-saxophone" },
  { id: "f-horn", label: "F horn", definitionId: "f-horn" },
] as const;

export type InstrumentId = (typeof instrumentOptions)[number]["id"];
export type PitchDisplay = "concert" | "written";
export type MainsHumFrequency = "off" | 50 | 60;

export interface Preferences {
  readonly instrumentId: InstrumentId;
  readonly pitchDisplay: PitchDisplay;
  readonly mainsHumFrequency: MainsHumFrequency;
}

export const defaultPreferences: Preferences = {
  instrumentId: "concert",
  pitchDisplay: "concert",
  mainsHumFrequency: "off",
};

export function isInstrumentId(value: unknown): value is InstrumentId {
  return instrumentOptions.some((instrument) => instrument.id === value);
}

export function isLegacyPreferences(
  value: unknown,
): value is Omit<Preferences, "mainsHumFrequency"> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isInstrumentId(candidate.instrumentId) &&
    (candidate.pitchDisplay === "concert" || candidate.pitchDisplay === "written") &&
    candidate.mainsHumFrequency === undefined
  );
}

export function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isInstrumentId(candidate.instrumentId) &&
    (candidate.pitchDisplay === "concert" || candidate.pitchDisplay === "written") &&
    (candidate.mainsHumFrequency === "off" ||
      candidate.mainsHumFrequency === 50 ||
      candidate.mainsHumFrequency === 60)
  );
}
