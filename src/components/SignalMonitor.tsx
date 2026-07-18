import { forwardRef, useImperativeHandle, useRef } from "react";
import { filterResponseDb, type InputFilterBand } from "../audio/inputFilterChain";
import {
  frequencyToLogPosition,
  waveformLevelDb,
  type SignalMonitorFrame,
} from "../audio/signalMonitor";

export interface SignalMonitorHandle {
  draw(frame: SignalMonitorFrame): void;
}

export const SignalMonitor = forwardRef<SignalMonitorHandle, { readonly bands: readonly InputFilterBand[]; readonly bypassed: boolean }>(function SignalMonitor({ bands, bypassed }, ref) {
  const waveformCanvas = useRef<HTMLCanvasElement>(null);
  const spectrumCanvas = useRef<HTMLCanvasElement>(null);
  const level = useRef<HTMLOutputElement>(null);
  const response = useRef({ bands, bypassed });
  response.current = { bands, bypassed };

  useImperativeHandle(ref, () => ({
    draw(frame) {
      drawWaveform(waveformCanvas.current, frame.waveform);
      drawSpectrum(spectrumCanvas.current, frame, response.current.bands, response.current.bypassed);
      if (level.current) {
        const decibels = waveformLevelDb(frame.waveform);
        level.current.textContent = Number.isFinite(decibels) ? `${decibels.toFixed(1)} dBFS` : "No signal";
      }
    },
  }), []);

  return (
    <section className="signal-monitor" aria-labelledby="signal-monitor-title">
      <div className="signal-monitor-heading">
        <div>
          <p className="signal-label">Local diagnostic</p>
          <h2 id="signal-monitor-title">Signal monitor</h2>
        </div>
        <p>Level <output ref={level}>Waiting for signal</output></p>
      </div>
      <p className="preferences-help">The spectrum is the raw microphone input. The amber response line shows what the filters pass to pitch detection.</p>
      <p className="visually-hidden">{bypassed ? "All filters bypassed; pitch detection receives the raw microphone signal." : bands.filter((band) => band.enabled).length === 0 ? "No filters enabled." : `${bands.filter((band) => band.enabled).length} filters compose before pitch detection.`}</p>
      <div className="signal-monitor-charts">
        <figure>
          <canvas ref={waveformCanvas} width="640" height="150" aria-hidden="true" />
          <figcaption>Waveform</figcaption>
        </figure>
        <figure>
          <canvas ref={spectrumCanvas} width="640" height="150" aria-hidden="true" />
          <figcaption>Raw spectrum and filter response: 20 Hz to 20 kHz; level -100 to -30 dBFS</figcaption>
        </figure>
      </div>
    </section>
  );
});

function canvasContext(canvas: HTMLCanvasElement | null) {
  if (!canvas) return undefined;
  const pixelRatio = Math.min(devicePixelRatio, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return canvas.getContext("2d") ?? undefined;
}

function drawWaveform(canvas: HTMLCanvasElement | null, waveform: Float32Array) {
  const context = canvasContext(canvas);
  if (!canvas || !context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#264d3d";
  context.lineWidth = 2;
  context.beginPath();
  for (let x = 0; x < canvas.width; x += 1) {
    const sample = waveform[Math.floor((x / canvas.width) * waveform.length)] ?? 0;
    const y = (0.5 - sample * 0.45) * canvas.height;
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
}

function drawSpectrum(canvas: HTMLCanvasElement | null, frame: SignalMonitorFrame, bands: readonly InputFilterBand[], bypassed: boolean) {
  const context = canvasContext(canvas);
  if (!canvas || !context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#5c5548";
  context.font = `${11 * Math.min(devicePixelRatio, 2)}px ui-monospace`;
  for (const frequency of [20, 50, 100, 1_000, 10_000, 20_000]) {
    const x = frequencyToLogPosition(frequency) * canvas.width;
    context.fillText(frequency >= 1_000 ? `${frequency / 1_000}k` : `${frequency}`, Math.min(x + 2, canvas.width - 28), canvas.height - 4);
  }
  for (const decibels of [-90, -60, -30]) {
    const y = (1 - (decibels - frame.minDecibels) / (frame.maxDecibels - frame.minDecibels)) * canvas.height;
    context.fillText(`${decibels}`, 3, Math.max(12, y - 2));
  }
  context.strokeStyle = "#264d3d";
  context.lineWidth = 2;
  context.beginPath();
  const nyquist = frame.sampleRate / 2;
  for (let index = 1; index < frame.spectrum.length; index += 1) {
    const frequency = (index * nyquist) / frame.spectrum.length;
    if (frequency < 20 || frequency > 20_000) continue;
    const x = frequencyToLogPosition(frequency) * canvas.width;
    const normalized = (frame.spectrum[index] - frame.minDecibels) / (frame.maxDecibels - frame.minDecibels);
    const y = (1 - Math.max(0, Math.min(1, normalized))) * canvas.height;
    context.lineTo(x, y);
  }
  context.stroke();
  context.setLineDash([6, 4]);
  context.strokeStyle = "#b15a23";
  context.fillStyle = "#7a3515";
  context.font = `${12 * Math.min(devicePixelRatio, 2)}px ui-monospace`;
  for (const frequency of [50, 60]) {
    const x = frequencyToLogPosition(frequency) * canvas.width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
    context.fillText(`${frequency} Hz`, x + 4, 14 * Math.min(devicePixelRatio, 2));
  }
  context.setLineDash([]);
  context.strokeStyle = "#d07820";
  context.lineWidth = 3;
  context.beginPath();
  for (let x = 0; x < canvas.width; x += 1) {
    const frequency = 20 * (1_000 ** (x / canvas.width));
    const responseDb = filterResponseDb(bands, frequency, frame.sampleRate, bypassed);
    const y = Math.min(canvas.height, Math.max(0, (-responseDb / 30) * canvas.height));
    if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.stroke();
}
