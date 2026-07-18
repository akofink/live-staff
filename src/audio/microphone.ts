import {
  lowPowerSignalMonitorFps,
  signalMonitorFps,
  type SignalMonitorFrame,
} from "./signalMonitor";

export type AudioCaptureErrorCode =
  | "not-supported"
  | "permission-denied"
  | "no-input-device"
  | "start-canceled"
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

export type AudioCaptureLifecycleEvent =
  | { readonly state: "running" }
  | { readonly state: "suspended"; readonly reason: "audio-context" | "background" | "route-change" }
  | { readonly state: "ended"; readonly reason: "device-lost" | "context-closed" }
  | { readonly state: "failed"; readonly error: AudioCaptureError };

export interface AudioCaptureSession {
  readonly sampleRate: number;
  pause(reason?: "background" | "route-change"): void;
  resume(): Promise<void>;
  setSignalMonitor(handler: SignalMonitorFrameHandler | undefined, lowPower?: boolean): void;
  stop(): Promise<void>;
}

export type AudioFrameHandler = (frame: Float32Array) => void;
export type SignalMonitorFrameHandler = (frame: SignalMonitorFrame) => void;
export type AudioCaptureLifecycleHandler = (event: AudioCaptureLifecycleEvent) => void;

export interface AudioCaptureDependencies {
  readonly getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  readonly createAudioContext: () => AudioContext;
  readonly requestFrame: (callback: FrameRequestCallback) => number;
  readonly cancelFrame: (handle: number) => void;
  readonly addDeviceChangeListener?: (listener: () => void) => void;
  readonly removeDeviceChangeListener?: (listener: () => void) => void;
}

const frameSize = 4_096;

export class MicrophoneCapture {
  #activeSession: AudioCaptureSession | undefined;
  #generation = 0;
  #pendingStart: Promise<AudioCaptureSession> | undefined;
  #pendingGeneration = 0;
  #queuedStart: Promise<AudioCaptureSession> | undefined;

  constructor(private readonly dependencies: AudioCaptureDependencies = browserDependencies()) {}

  start(
    onFrame: AudioFrameHandler,
    onLifecycle: AudioCaptureLifecycleHandler = () => undefined,
  ): Promise<AudioCaptureSession> {
    if (this.#pendingStart) {
      if (this.#pendingGeneration === this.#generation) return this.#pendingStart;
      if (!this.#queuedStart) {
        const queued = this.#pendingStart
          .catch(() => undefined)
          .then(() => this.start(onFrame, onLifecycle));
        this.#queuedStart = queued;
        void queued.finally(() => {
          if (this.#queuedStart === queued) this.#queuedStart = undefined;
        }).catch(() => undefined);
      }
      return this.#queuedStart;
    }

    const generation = ++this.#generation;
    this.#pendingGeneration = generation;
    const start = this.#start(generation, onFrame, onLifecycle);
    this.#pendingStart = start;
    void start.finally(() => {
      if (this.#pendingStart === start) this.#pendingStart = undefined;
    }).catch(() => undefined);
    return start;
  }

  async #start(
    generation: number,
    onFrame: AudioFrameHandler,
    onLifecycle: AudioCaptureLifecycleHandler,
  ): Promise<AudioCaptureSession> {
    await this.#activeSession?.stop();
    this.#assertCurrent(generation);

    let stream: MediaStream | undefined;
    let audioContext: AudioContext | undefined;
    let session: AudioCaptureSession | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;

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
      this.#assertCurrent(generation);
      audioContext = this.dependencies.createAudioContext();
      this.#assertCurrent(generation);

      if (audioContext.state === "suspended") {
        await audioContext.resume();
        this.#assertCurrent(generation);
      }

      const activeStream = stream;
      const activeAudioContext = audioContext;
      source = activeAudioContext.createMediaStreamSource(activeStream);
      analyser = activeAudioContext.createAnalyser();
      analyser.fftSize = frameSize;
      source.connect(analyser);
      const activeSource = source;
      const activeAnalyser = analyser;
      const initialDeviceId = activeStream.getAudioTracks?.()[0]?.getSettings?.().deviceId;

      let frameHandle: number | undefined;
      let stopped = false;
      let paused = false;
      let monitorHandler: SignalMonitorFrameHandler | undefined;
      let monitorIntervalMs = 1_000 / signalMonitorFps;
      let lastMonitorTimestamp = -Infinity;
      const frame = new Float32Array(activeAnalyser.fftSize);
      let spectrum: Float32Array<ArrayBuffer> | undefined;

      const removeListeners = () => {
        activeAudioContext.removeEventListener?.("statechange", handleContextState);
        activeStream.getTracks().forEach((track) => track.removeEventListener?.("ended", handleTrackEnded));
        this.dependencies.removeDeviceChangeListener?.(handleDeviceChange);
      };
      const cleanup = async () => {
        if (stopped) return;
        stopped = true;
        paused = true;
        monitorHandler = undefined;
        spectrum = undefined;
        removeListeners();
        if (frameHandle !== undefined) {
          try { this.dependencies.cancelFrame(frameHandle); } catch { /* Continue releasing resources. */ }
          frameHandle = undefined;
        }
        try { activeSource.disconnect(); } catch { /* Continue releasing resources. */ }
        try { activeAnalyser.disconnect(); } catch { /* Continue releasing resources. */ }
        activeStream.getTracks().forEach((track) => {
          try { track.stop(); } catch { /* Continue releasing resources. */ }
        });
        try {
          if (activeAudioContext.state !== "closed") await activeAudioContext.close();
        } catch { /* The remaining local references are still released. */ }
        if (this.#activeSession === session) this.#activeSession = undefined;
      };
      const terminate = (event: AudioCaptureLifecycleEvent) => {
        if (stopped) return;
        void cleanup().finally(() => onLifecycle(event));
      };
      const handleTrackEnded = () => terminate({ state: "ended", reason: "device-lost" });
      const handleContextState = () => {
        if (stopped) return;
        if (activeAudioContext.state === "closed") {
          terminate({ state: "ended", reason: "context-closed" });
        } else if (activeAudioContext.state === "suspended" || String(activeAudioContext.state) === "interrupted") {
          pause("audio-context");
        } else if (activeAudioContext.state === "running") {
          paused = false;
          scheduleFrame();
          onLifecycle({ state: "running" });
        }
      };
      const handleDeviceChange = () => {
        if (activeStream.getTracks().some((track) => track.readyState === "ended")) {
          handleTrackEnded();
          return;
        }
        const nextDeviceId = activeStream.getAudioTracks?.()[0]?.getSettings?.().deviceId;
        if (initialDeviceId && nextDeviceId && nextDeviceId !== initialDeviceId) {
          pause("route-change");
        }
      };
      function scheduleFrame() {
        if (!stopped && !paused && frameHandle === undefined) {
          frameHandle = requestFrame(readFrame);
        }
      }
      const requestFrame = this.dependencies.requestFrame;
      const cancelFrame = this.dependencies.cancelFrame;
      function readFrame(timestamp: number) {
        frameHandle = undefined;
        if (stopped) return;
        if (!paused && activeAudioContext.state === "running") {
          try {
            activeAnalyser.getFloatTimeDomainData(frame);
            onFrame(frame.slice());
            if (monitorHandler && timestamp - lastMonitorTimestamp >= monitorIntervalMs) {
              lastMonitorTimestamp = timestamp;
              activeAnalyser.getFloatFrequencyData(spectrum!);
              monitorHandler({
                waveform: frame.slice(),
                spectrum: spectrum!.slice(),
                sampleRate: activeAudioContext.sampleRate,
                minDecibels: activeAnalyser.minDecibels,
                maxDecibels: activeAnalyser.maxDecibels,
              });
            }
          } catch {
            terminate({
              state: "failed",
              error: new AudioCaptureError("start-failed", "Microphone analysis stopped unexpectedly. Try again."),
            });
            return;
          }
        }
        scheduleFrame();
      }
      function pause(reason: "background" | "route-change" | "audio-context") {
        if (stopped || paused) return;
        paused = true;
        if (frameHandle !== undefined) {
          cancelFrame(frameHandle);
          frameHandle = undefined;
        }
        onLifecycle({ state: "suspended", reason });
      }

      session = {
        sampleRate: activeAudioContext.sampleRate,
        pause: (reason = "background") => {
          pause(reason);
        },
        resume: async () => {
          if (stopped) throw new AudioCaptureError("start-failed", "The microphone session ended. Try again.");
          if (activeStream.getTracks().some((track) => track.readyState === "ended")) {
            handleTrackEnded();
            throw new AudioCaptureError("no-input-device", "The microphone disconnected. Connect it and try again.");
          }
          try {
            if (activeAudioContext.state !== "running") await activeAudioContext.resume();
            if (activeAudioContext.state !== "running") throw new Error("Audio context did not resume.");
            paused = false;
            scheduleFrame();
            onLifecycle({ state: "running" });
          } catch {
            throw new AudioCaptureError("start-failed", "Microphone audio is paused. Resume it to continue.");
          }
        },
        setSignalMonitor: (handler, lowPower = false) => {
          monitorHandler = handler;
          spectrum = handler ? new Float32Array(activeAnalyser.frequencyBinCount) : undefined;
          monitorIntervalMs = 1_000 / (lowPower ? lowPowerSignalMonitorFps : signalMonitorFps);
          lastMonitorTimestamp = -Infinity;
        },
        stop: cleanup,
      };

      activeAudioContext.addEventListener?.("statechange", handleContextState);
      activeStream.getTracks().forEach((track) => track.addEventListener?.("ended", handleTrackEnded));
      this.dependencies.addDeviceChangeListener?.(handleDeviceChange);
      scheduleFrame();
      this.#assertCurrent(generation);
      this.#activeSession = session;
      return session;
    } catch (error) {
      if (session) await session.stop();
      else {
        try { source?.disconnect(); } catch { /* Continue startup cleanup. */ }
        try { analyser?.disconnect(); } catch { /* Continue startup cleanup. */ }
        stream?.getTracks().forEach((track) => {
          try { track.stop(); } catch { /* Continue startup cleanup. */ }
        });
        try { if (audioContext?.state !== "closed") await audioContext?.close(); } catch { /* Preserve original error. */ }
      }
      throw toAudioCaptureError(error);
    }
  }

  async stop(): Promise<void> {
    this.#generation += 1;
    const active = this.#activeSession;
    this.#activeSession = undefined;
    await active?.stop();
  }

  #assertCurrent(generation: number) {
    if (generation !== this.#generation) {
      throw new AudioCaptureError("start-canceled", "Microphone startup was canceled.");
    }
  }
}

function browserDependencies(): AudioCaptureDependencies {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
    throw new AudioCaptureError("not-supported", "This browser does not support microphone analysis.");
  }

  return {
    getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    createAudioContext: () => new AudioContext(),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
    addDeviceChangeListener: (listener) => navigator.mediaDevices.addEventListener("devicechange", listener),
    removeDeviceChangeListener: (listener) => navigator.mediaDevices.removeEventListener("devicechange", listener),
  };
}

function toAudioCaptureError(error: unknown): AudioCaptureError {
  if (error instanceof AudioCaptureError) return error;
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return new AudioCaptureError("permission-denied", "Microphone access was denied. Allow access and try again.");
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return new AudioCaptureError("no-input-device", "No microphone was found. Connect one and try again.");
    }
  }
  return new AudioCaptureError("start-failed", "Live Staff could not start listening. Try again or check your microphone settings.");
}
