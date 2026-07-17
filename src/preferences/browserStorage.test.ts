import { describe, expect, it } from "vitest";
import { loadPreferences, preferencesStorageKey, savePreferences, type StorageAdapter } from "./browserStorage";
import { defaultPreferences } from "./preferences";

function createStorage(initialValue: string | null): StorageAdapter {
  let value = initialValue;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = nextValue;
    },
  };
}

describe("browser preferences storage", () => {
  it("uses safe defaults when there is no stored preference", () => {
    expect(loadPreferences(createStorage(null))).toEqual(defaultPreferences);
  });

  it("migrates saved pitch-display preferences to instrument-led notation", () => {
    const storage = createStorage('{"instrumentId":"b-flat-trumpet","pitchDisplay":"written"}');

    expect(loadPreferences(storage)).toEqual({
      instrumentId: "b-flat-trumpet",
      mainsHumFrequency: "off",
    });
  });

  it("preserves local hum suppression while removing the retired pitch display preference", () => {
    const storage = createStorage('{"instrumentId":"f-horn","pitchDisplay":"concert","mainsHumFrequency":60}');

    expect(loadPreferences(storage)).toEqual({
      instrumentId: "f-horn",
      mainsHumFrequency: 60,
    });
  });

  it("recovers from malformed or unsupported stored values", () => {
    expect(loadPreferences(createStorage("not json"))).toEqual(defaultPreferences);
    expect(loadPreferences(createStorage('{"instrumentId":"unknown","pitchDisplay":"written"}'))).toEqual(
      defaultPreferences,
    );
  });

  it("stores the selected instrument and local hum setting", () => {
    const storage = createStorage(null);
    const preferences = {
      instrumentId: "f-horn",
      mainsHumFrequency: 60,
    } as const;

    expect(savePreferences(storage, preferences)).toBe(true);
    expect(storage.getItem(preferencesStorageKey)).toBe(JSON.stringify(preferences));
    expect(loadPreferences(storage)).toEqual(preferences);
  });

  it("does not fail the app when browser storage is unavailable", () => {
    const unavailableStorage: StorageAdapter = {
      getItem: () => {
        throw new Error("Storage is unavailable");
      },
      setItem: () => {
        throw new Error("Storage is unavailable");
      },
    };

    expect(loadPreferences(unavailableStorage)).toEqual(defaultPreferences);
    expect(savePreferences(unavailableStorage, defaultPreferences)).toBe(false);
    expect(loadPreferences(undefined)).toEqual(defaultPreferences);
    expect(savePreferences(undefined, defaultPreferences)).toBe(false);
  });
});
