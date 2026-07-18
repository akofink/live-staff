import { defaultPreferences, isLegacyPreferences, isPreferences, type Preferences } from "./preferences";

export const preferencesStorageKey = "live-staff.preferences";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function getBrowserStorage(): StorageAdapter | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Reads only local display and audio-processing choices. Audio frames and detected notes are never persisted. */
export function loadPreferences(storage: StorageAdapter | undefined): Preferences {
  if (!storage) {
    return defaultPreferences;
  }

  try {
    const storedValue = storage.getItem(preferencesStorageKey);
    if (storedValue === null) {
      return defaultPreferences;
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (isLegacyPreferences(parsedValue)) {
      return {
        instrumentId: parsedValue.instrumentId,
        mainsHumFrequency: parsedValue.mainsHumFrequency ?? "off",
        inputFilters: parsedValue.mainsHumFrequency === 50 || parsedValue.mainsHumFrequency === 60
          ? [{ id: "migrated-hum", type: "notch", enabled: true, frequencyHz: parsedValue.mainsHumFrequency, q: 30, attenuationDb: 24 }]
          : [],
      };
    }

    if (typeof parsedValue === "object" && parsedValue !== null && !("inputFilters" in parsedValue)) {
      const previous = parsedValue as { instrumentId?: unknown; mainsHumFrequency?: unknown };
      if (typeof previous.instrumentId === "string" && (previous.mainsHumFrequency === "off" || previous.mainsHumFrequency === 50 || previous.mainsHumFrequency === 60)) {
        const migrated = {
          instrumentId: previous.instrumentId,
          mainsHumFrequency: previous.mainsHumFrequency,
          inputFilters: previous.mainsHumFrequency === "off" ? [] : [{ id: "migrated-hum", type: "notch" as const, enabled: true, frequencyHz: previous.mainsHumFrequency, q: 30, attenuationDb: 24 }],
        };
        return isPreferences(migrated) ? migrated : defaultPreferences;
      }
    }

    return isPreferences(parsedValue) ? parsedValue : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(storage: StorageAdapter | undefined, preferences: Preferences): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(preferencesStorageKey, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
