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

  it("cancels pending startup, releases its eventual stream, and deduplicates requests", async () => {
    let resolveStream: ((stream: MediaStream) => void) | undefined;
    const stopTrack = vi.fn();
    const browser = {
      ...dependencies(),
      getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => { resolveStream = resolve; })),
    };
    const capture = new MicrophoneCapture(browser);

    const first = capture.start(vi.fn());
    const duplicate = capture.start(vi.fn());
    expect(duplicate).toBe(first);
    await vi.waitFor(() => expect(browser.getUserMedia).toHaveBeenCalledTimes(1));

    await capture.stop();
    resolveStream?.({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream);

    await expect(first).rejects.toMatchObject({ code: "start-canceled" });
    await expect(duplicate).rejects.toMatchObject({ code: "start-canceled" });
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(browser.createAudioContext).not.toHaveBeenCalled();
  });

  it("queues one fresh request when recovery is selected before canceled startup settles", async () => {
    const resolvers: Array<(stream: MediaStream) => void> = [];
    const firstStop = vi.fn();
    const browser = {
      ...dependencies(),
      getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => { resolvers.push(resolve); })),
    };
    const capture = new MicrophoneCapture(browser);
    const canceled = capture.start(vi.fn());
    await vi.waitFor(() => expect(resolvers).toHaveLength(1));
    await capture.stop();

    const recovery = capture.start(vi.fn());
    const duplicateRecovery = capture.start(vi.fn());
    expect(duplicateRecovery).toBe(recovery);
    expect(browser.getUserMedia).toHaveBeenCalledOnce();
    resolvers[0]({ getTracks: () => [{ stop: firstStop }] } as unknown as MediaStream);
    await expect(canceled).rejects.toMatchObject({ code: "start-canceled" });
    await vi.waitFor(() => expect(resolvers).toHaveLength(2));
    expect(firstStop).toHaveBeenCalledOnce();

    resolvers[1]({ getTracks: () => [] } as unknown as MediaStream);
    const session = await recovery;
    expect(browser.getUserMedia).toHaveBeenCalledTimes(2);
    await session.stop();
  });

  it("pauses frame work for context suspension and resumes the same session", async () => {
    let scheduledFrame: FrameRequestCallback | undefined;
    let state: AudioContextState = "running";
    let stateListener: (() => void) | undefined;
    const resume = vi.fn(async () => { state = "running"; stateListener?.(); });
    const read = vi.fn();
    const lifecycle = vi.fn();
    const browser: AudioCaptureDependencies = {
      ...dependencies(),
      requestFrame: vi.fn((callback) => { scheduledFrame = callback; return 2; }),
      createAudioContext: vi.fn(() => ({
        get state() { return state; },
        sampleRate: 48_000,
        addEventListener: (_name: string, listener: () => void) => { stateListener = listener; },
        removeEventListener: vi.fn(),
        createMediaStreamSource: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
        createAnalyser: () => ({ fftSize: 4_096, getFloatTimeDomainData: read, disconnect: vi.fn() }),
        close: vi.fn().mockResolvedValue(undefined),
        resume,
      })) as unknown as () => AudioContext,
    };

    const session = await new MicrophoneCapture(browser).start(vi.fn(), lifecycle);
    scheduledFrame?.(0);
    expect(read).toHaveBeenCalledOnce();
    state = "suspended";
    stateListener?.();
    scheduledFrame?.(1);
    expect(read).toHaveBeenCalledOnce();
    expect(lifecycle).toHaveBeenCalledWith({ state: "suspended", reason: "audio-context" });

    await session.resume();
    scheduledFrame?.(2);
    expect(resume).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledTimes(2);
    await session.stop();
  });

  it("treats an ended track as terminal and releases every resource once", async () => {
    let ended: (() => void) | undefined;
    const stopTrack = vi.fn();
    const disconnectSource = vi.fn();
    const disconnectAnalyser = vi.fn();
    const close = vi.fn().mockResolvedValue(undefined);
    const lifecycle = vi.fn();
    const track = {
      readyState: "live",
      stop: stopTrack,
      addEventListener: (_name: string, listener: () => void) => { ended = listener; },
      removeEventListener: vi.fn(),
    };
    const browser: AudioCaptureDependencies = {
      ...dependencies(),
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }),
      createAudioContext: vi.fn(() => ({
        state: "running",
        sampleRate: 48_000,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        createMediaStreamSource: () => ({ connect: vi.fn(), disconnect: disconnectSource }),
        createAnalyser: () => ({ fftSize: 4_096, getFloatTimeDomainData: vi.fn(), disconnect: disconnectAnalyser }),
        close,
        resume: vi.fn(),
      })) as unknown as () => AudioContext,
    };
    const capture = new MicrophoneCapture(browser);
    const session = await capture.start(vi.fn(), lifecycle);

    ended?.();
    await vi.waitFor(() => expect(lifecycle).toHaveBeenCalledWith({ state: "ended", reason: "device-lost" }));
    await session.stop();
    await capture.stop();

    expect(stopTrack).toHaveBeenCalledOnce();
    expect(disconnectSource).toHaveBeenCalledOnce();
    expect(disconnectAnalyser).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(browser.cancelFrame).toHaveBeenCalledOnce();
  });
});
