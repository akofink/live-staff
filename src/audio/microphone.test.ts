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

  it("performs no spectrum work by default and stops monitor reads immediately", async () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    const getFloatFrequencyData = vi.fn();
    const browser: AudioCaptureDependencies = {
      ...dependencies(),
      requestFrame: vi.fn((callback) => {
        scheduledFrame = callback;
        return 7;
      }),
      createAudioContext: vi.fn(() => ({
        state: "running",
        sampleRate: 48_000,
        createMediaStreamSource: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
        createAnalyser: () => ({
          fftSize: 4_096,
          frequencyBinCount: 2_048,
          minDecibels: -100,
          maxDecibels: -30,
          getFloatTimeDomainData: vi.fn(),
          getFloatFrequencyData,
          disconnect: vi.fn(),
        }),
        close: vi.fn().mockResolvedValue(undefined),
        resume: vi.fn(),
      })) as unknown as () => AudioContext,
    };

    const session = await new MicrophoneCapture(browser).start(vi.fn());
    scheduledFrame?.(0);
    scheduledFrame?.(100);
    expect(getFloatFrequencyData).not.toHaveBeenCalled();

    const monitor = vi.fn();
    session.setSignalMonitor(monitor);
    scheduledFrame?.(200);
    scheduledFrame?.(250);
    scheduledFrame?.(300);
    expect(getFloatFrequencyData).toHaveBeenCalledTimes(2);
    expect(monitor).toHaveBeenCalledTimes(2);

    session.setSignalMonitor(undefined);
    scheduledFrame?.(400);
    expect(getFloatFrequencyData).toHaveBeenCalledTimes(2);
    await session.stop();
    expect(browser.cancelFrame).toHaveBeenCalledWith(7);
  });

  it("caps low-power monitor snapshots at five frames per second", async () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    const monitor = vi.fn();
    const browser: AudioCaptureDependencies = {
      ...dependencies(),
      requestFrame: vi.fn((callback) => {
        scheduledFrame = callback;
        return 1;
      }),
      createAudioContext: vi.fn(() => ({
        state: "running",
        sampleRate: 48_000,
        createMediaStreamSource: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
        createAnalyser: () => ({
          fftSize: 4_096,
          frequencyBinCount: 2_048,
          minDecibels: -100,
          maxDecibels: -30,
          getFloatTimeDomainData: vi.fn(),
          getFloatFrequencyData: vi.fn(),
          disconnect: vi.fn(),
        }),
        close: vi.fn().mockResolvedValue(undefined),
        resume: vi.fn(),
      })) as unknown as () => AudioContext,
    };
    const session = await new MicrophoneCapture(browser).start(vi.fn());
    session.setSignalMonitor(monitor, true);
    for (const timestamp of [0, 50, 100, 150, 199, 200, 399, 400]) scheduledFrame?.(timestamp);
    expect(monitor).toHaveBeenCalledTimes(3);
    await session.stop();
  });
});
