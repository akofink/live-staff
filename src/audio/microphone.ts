import {
  lowPowerSignalMonitorFps,
  signalMonitorFps,
  type SignalMonitorFrame,
} from "./signalMonitor";

export type AudioCaptureErrorCode =
  | "not-supported"
  | "permission-denied"
  | "no-input-device"
  | "start-failed";

export class AudioCaptureError extends Error {
  constructor(
    public readonly code: AudioCaptureErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AudioCaptureError";
  }
}

export interface AudioCaptureSession {
  readonly sampleRate: number;
  setSignalMonitor(handler: SignalMonitorFrameHandler | undefined, lowPower?: boolean): void;
  stop(): Promise<void>;
}

export type AudioFrameHandler = (frame: Float32Array) => void;
export type SignalMonitorFrameHandler = (frame: SignalMonitorFrame) => void;

export interface AudioCaptureDependencies {
  readonly getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  readonly createAudioContext: () => AudioContext;
  readonly requestFrame: (callback: FrameRequestCallback) => number;
  readonly cancelFrame: (handle: number) => void;
}

const frameSize = 4_096;

export class MicrophoneCapture {
  #activeSession: AudioCaptureSession | undefined;

  constructor(private readonly dependencies: AudioCaptureDependencies = browserDependencies()) {}

  async start(onFrame: AudioFrameHandler): Promise<AudioCaptureSession> {
    await this.stop();

    let stream: MediaStream | undefined;
    let audioContext: AudioContext | undefined;

    try {
      stream = await this.dependencies.getUserMedia({
        audio: {
          autoGainControl: false,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
        },
        video: false,
      });
      audioContext = this.dependencies.createAudioContext();

      if (!stream || !audioContext) {
        throw new AudioCaptureError("start-failed", "Microphone capture did not initialize.");
      }

      const activeStream = stream;
      const activeAudioContext = audioContext;

      if (activeAudioContext.state === "suspended") {
        await activeAudioContext.resume();
      }

      const source = activeAudioContext.createMediaStreamSource(activeStream);
      const analyser = activeAudioContext.createAnalyser();
      analyser.fftSize = frameSize;
      source.connect(analyser);

      let frameHandle: number | undefined;
      let stopped = false;
      let monitorHandler: SignalMonitorFrameHandler | undefined;
      let monitorIntervalMs = 1_000 / signalMonitorFps;
      let lastMonitorTimestamp = -Infinity;
      const frame = new Float32Array(analyser.fftSize);
      let spectrum: Float32Array<ArrayBuffer> | undefined;
      const readFrame = (timestamp: number) => {
        if (stopped) {
          return;
        }

        analyser.getFloatTimeDomainData(frame);
        onFrame(frame.slice());
        if (monitorHandler && timestamp - lastMonitorTimestamp >= monitorIntervalMs) {
          lastMonitorTimestamp = timestamp;
          analyser.getFloatFrequencyData(spectrum!);
          monitorHandler({
            waveform: frame.slice(),
            spectrum: spectrum!.slice(),
            sampleRate: activeAudioContext.sampleRate,
            minDecibels: analyser.minDecibels,
            maxDecibels: analyser.maxDecibels,
          });
        }
        frameHandle = this.dependencies.requestFrame(readFrame);
      };
      frameHandle = this.dependencies.requestFrame(readFrame);

      const session: AudioCaptureSession = {
        sampleRate: activeAudioContext.sampleRate,
        setSignalMonitor: (handler, lowPower = false) => {
          monitorHandler = handler;
          spectrum = handler ? new Float32Array(analyser.frequencyBinCount) : undefined;
          monitorIntervalMs = 1_000 / (lowPower ? lowPowerSignalMonitorFps : signalMonitorFps);
          lastMonitorTimestamp = -Infinity;
        },
        stop: async () => {
          if (stopped) {
            return;
          }

          stopped = true;
          monitorHandler = undefined;
          if (frameHandle !== undefined) {
            this.dependencies.cancelFrame(frameHandle);
          }
          source.disconnect();
          analyser.disconnect();
          activeStream.getTracks().forEach((track) => track.stop());
          await activeAudioContext.close();
          if (this.#activeSession === session) {
            this.#activeSession = undefined;
          }
        },
      };

      this.#activeSession = session;
      return session;
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      await audioContext?.close();
      throw toAudioCaptureError(error);
    }
  }

  async stop(): Promise<void> {
    await this.#activeSession?.stop();
  }
}

function browserDependencies(): AudioCaptureDependencies {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
    throw new AudioCaptureError(
      "not-supported",
      "This browser does not support microphone analysis.",
    );
  }

  return {
    getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    createAudioContext: () => new AudioContext(),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
  };
}

function toAudioCaptureError(error: unknown): AudioCaptureError {
  if (error instanceof AudioCaptureError) {
    return error;
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return new AudioCaptureError(
        "permission-denied",
        "Microphone access was denied. Allow access and try again.",
      );
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return new AudioCaptureError(
        "no-input-device",
        "No microphone was found. Connect one and try again.",
      );
    }
  }

  return new AudioCaptureError(
    "start-failed",
    "Live Staff could not start listening. Try again or check your microphone settings.",
  );
}
