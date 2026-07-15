import { describe, expect, it, vi } from "vitest";
import {
  AudioCaptureError,
  MicrophoneCapture,
  type AudioCaptureDependencies,
} from "./microphone";

function dependencies(): AudioCaptureDependencies {
  return {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    createAudioContext: vi.fn(() => ({
      state: "running",
      sampleRate: 48_000,
      createMediaStreamSource: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
      createAnalyser: () => ({
        fftSize: 0,
        getFloatTimeDomainData: vi.fn(),
        disconnect: vi.fn(),
      }),
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn(),
    })) as unknown as () => AudioContext,
    requestFrame: vi.fn(() => 1),
    cancelFrame: vi.fn(),
  };
}

describe("MicrophoneCapture", () => {
  it("requests a monophonic pitch-analysis stream and releases it on stop", async () => {
    const browser = dependencies();
    const capture = new MicrophoneCapture(browser);

    const session = await capture.start(vi.fn());
    await session.stop();

    expect(browser.getUserMedia).toHaveBeenCalledWith({
      audio: {
        autoGainControl: false,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
      },
      video: false,
    });
    expect(browser.cancelFrame).toHaveBeenCalledWith(1);
  });

  it("maps a denied permission to an actionable error", async () => {
    const browser = {
      ...dependencies(),
      getUserMedia: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
    };

    await expect(new MicrophoneCapture(browser).start(vi.fn())).rejects.toEqual(
      new AudioCaptureError(
        "permission-denied",
        "Microphone access was denied. Allow access and try again.",
      ),
    );
  });
});
