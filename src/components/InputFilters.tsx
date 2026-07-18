import { defaultNotch, maximumFilterBands, type InputFilterBand } from "../audio/inputFilterChain";

export function InputFilters({ bands, bypassed, onChange, onBypass }: {
  readonly bands: readonly InputFilterBand[];
  readonly bypassed: boolean;
  readonly onChange: (bands: readonly InputFilterBand[]) => void;
  readonly onBypass: (bypassed: boolean) => void;
}) {
  const update = (index: number, patch: Partial<InputFilterBand>) => onChange(bands.map((band, candidate) => candidate === index ? { ...band, ...patch } as InputFilterBand : band));
  return <fieldset className="input-filters">
    <legend>Input filters</legend>
    <p className="preferences-help">Filters affect pitch detection only. Use narrow cuts and compare often so you do not hide your voice or instrument.</p>
    <label className="filter-toggle"><input type="checkbox" checked={bypassed} onChange={(event) => onBypass(event.target.checked)} /> Bypass all filters</label>
    <p className="preferences-help">Temporarily sends the original microphone signal to pitch detection. Your settings are kept.</p>
    <div className="filter-list">
      {bands.map((band, index) => {
        const name = band.type === "notch" ? `Band-stop ${index + 1}` : band.type === "highpass" ? `Rumble reduction ${index + 1}` : `Hiss reduction ${index + 1}`;
        return <fieldset className="filter-band" key={band.id}>
        <legend>{name}</legend>
        <label className="filter-toggle"><input type="checkbox" name={`${band.id}-enabled`} checked={band.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} /> Enabled</label>
        <label>Filter type<select name={`${band.id}-type`} value={band.type} onChange={(event) => {
          const type = event.target.value as InputFilterBand["type"];
          update(index, type === "notch" ? { type, frequencyHz: 60, q: 20, attenuationDb: 18 } : type === "highpass" ? { type, frequencyHz: 40 } : { type, frequencyHz: 14_000 });
        }}><option value="notch">Narrow band-stop</option><option value="highpass">Rumble reduction</option><option value="lowpass">Hiss reduction</option></select></label>
        <label>Frequency <output>{band.frequencyHz >= 1_000 ? `${band.frequencyHz / 1_000} kHz` : `${band.frequencyHz} Hz`}</output>
          <input type="range" name={`${band.id}-frequency`} aria-label={`${name} frequency`} min={band.type === "highpass" ? 20 : band.type === "lowpass" ? 8_000 : 40} max={band.type === "highpass" ? 80 : band.type === "lowpass" ? 18_000 : 4_000} step={band.type === "highpass" ? 5 : band.type === "lowpass" ? 1_000 : 1} value={band.frequencyHz} aria-valuetext={`${band.frequencyHz} hertz`} onChange={(event) => update(index, { frequencyHz: Number(event.target.value) })} />
        </label>
        {band.type === "notch" && <><label>Width<select name={`${band.id}-width`} aria-label={`${name} width`} value={band.q} onChange={(event) => update(index, { q: Number(event.target.value) })}><option value="30">Very narrow</option><option value="20">Narrow</option><option value="12">Moderate</option><option value="8">Wider</option></select></label><label>Reduction <output>{band.attenuationDb} dB</output><input type="range" name={`${band.id}-reduction`} aria-label={`${name} reduction`} min="3" max="24" step="3" value={band.attenuationDb} aria-valuetext={`${band.attenuationDb} decibels`} onChange={(event) => update(index, { attenuationDb: Number(event.target.value) })} /></label></>}
        <button type="button" onClick={() => onChange(bands.filter((_, candidate) => candidate !== index))}>Remove filter</button>
      </fieldset>;})}
    </div>
    <div className="filter-actions"><button type="button" disabled={bands.length >= maximumFilterBands} onClick={() => onChange([...bands, { ...defaultNotch, id: `filter-${Date.now()}` }])}>Add band-stop filter</button><button type="button" disabled={bands.length === 0} onClick={() => onChange([])}>Reset filters</button></div>
    <details><summary>Why use input filters?</summary><p>Steady noise can come from air systems, lighting, cables, or power supplies. A narrow band-stop removes one noise tone. Rumble and hiss controls can also remove useful musical sound, so leave them off unless needed and compare with bypass.</p></details>
  </fieldset>;
}
