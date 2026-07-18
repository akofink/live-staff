import { detectorDefaults } from "../audio/detectors/autocorrelation";

export const detectorEvidencePolicy = {
  schemaVersion: 1,
  supportedRangeHz: { minimum: 58.27, maximum: 987.77 },
  detector: {
    minimumRms: detectorDefaults.minimumRms,
    minimumConfidence: detectorDefaults.minimumConfidence,
    maximumAbsoluteCentsError: 20,
    minimumPitchAccuracy: 1,
    maximumOctaveErrorRate: 0,
    maximumFalsePositiveRate: 0,
    minimumUncertainAbsenceRate: 1,
  },
  stableDisplay: {
    frameCadenceMs: 80,
    maximumLatencyMs: 250,
    worstAlignedModeledLatencyMs: 160,
  },
  recordedPianoRegression: {
    expectedInRangeFixtures: 10,
    minimumMatchingFixtures: 3,
    minimumEstimates: 31,
    maximumOctaveErrors: 20,
  },
} as const;
