import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);

const keys = (value, allowed, at) => {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${at} has unknown field ${key}`);
};
const requiredString = (value, at) => { if (typeof value !== "string" || value.length === 0) throw new Error(`${at} must be a non-empty string`); };
const isoDate = (value, at) => { requiredString(value, at); if (Number.isNaN(Date.parse(value))) throw new Error(`${at} must be an ISO timestamp`); };
const oneOf = (value, options, at) => { if (!options.includes(value)) throw new Error(`${at} must be one of ${options.join(", ")}`); };
const hashPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pitchPattern = /^([A-G])(#|b)?(-?[0-9]+)$/;
const pitchClasses = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export async function probeMedia(path) {
  let stdout;
  try { ({ stdout } = await execute("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "format=format_name:stream=codec_name,profile,sample_rate,channels", "-of", "json", path])); }
  catch (error) { throw new Error(`ffprobe could not inspect ${path}: ${error.message}`); }
  const result = JSON.parse(stdout); const stream = result.streams?.[0];
  if (!stream) throw new Error(`${path} has no decodable audio stream`);
  return { format: result.format?.format_name ?? "", codec: stream.codec_name, profile: stream.profile ?? "", sampleRateHz: Number(stream.sample_rate), channels: stream.channels };
}

export async function validateManifest(manifestPath, mediaProbe = probeMedia) {
  const absoluteManifest = resolve(manifestPath);
  const root = await realpath(dirname(absoluteManifest));
  const manifest = JSON.parse(await readFile(absoluteManifest, "utf8"));
  keys(manifest, ["schemaVersion", "setId", "capturedAt", "instrument", "performer", "capture", "room", "consent", "takes", "decoderConsistency"], "manifest");
  if (manifest.schemaVersion !== 1) throw new Error("manifest.schemaVersion must be 1");
  requiredString(manifest.setId, "manifest.setId"); if (!idPattern.test(manifest.setId)) throw new Error("manifest.setId is invalid"); isoDate(manifest.capturedAt, "manifest.capturedAt");
  keys(manifest.instrument, ["family", "makeModel", "identifier"], "instrument");
  oneOf(manifest.instrument.family, ["piano", "voice", "woodwind", "brass", "bowed-string", "plucked-string"], "instrument.family");
  requiredString(manifest.instrument.makeModel, "instrument.makeModel"); requiredString(manifest.instrument.identifier, "instrument.identifier");
  keys(manifest.performer, ["anonymousId", "confirmedPerformedNotes"], "performer"); requiredString(manifest.performer.anonymousId, "performer.anonymousId");
  if (manifest.performer.confirmedPerformedNotes !== true) throw new Error("performer.confirmedPerformedNotes must be true");
  keys(manifest.capture, ["device", "microphone", "path", "distanceMeters", "sampleRateHz"], "capture");
  requiredString(manifest.capture.device, "capture.device"); requiredString(manifest.capture.microphone, "capture.microphone");
  oneOf(manifest.capture.path, ["phone-built-in", "laptop-built-in", "wired-external", "bluetooth"], "capture.path");
  if (!(manifest.capture.distanceMeters > 0)) throw new Error("capture.distanceMeters must be positive"); oneOf(manifest.capture.sampleRateHz, [44100, 48000], "capture.sampleRateHz");
  keys(manifest.room, ["description", "condition"], "room"); requiredString(manifest.room.description, "room.description"); oneOf(manifest.room.condition, ["quiet", "hvac-or-fan"], "room.condition");
  keys(manifest.consent, ["projectUseGranted", "publicRepositoryGranted", "confirmedAt", "confirmedByAnonymousId"], "consent");
  if (manifest.consent.projectUseGranted !== true || manifest.consent.publicRepositoryGranted !== true) throw new Error("consent grants must be true");
  isoDate(manifest.consent.confirmedAt, "consent.confirmedAt"); requiredString(manifest.consent.confirmedByAnonymousId, "consent.confirmedByAnonymousId");
  if (!Array.isArray(manifest.takes) || manifest.takes.length === 0) throw new Error("takes must be a non-empty array");
  const takeIds = new Set();
  for (const [index, take] of manifest.takes.entries()) {
    const at = `takes[${index}]`; keys(take, ["takeId", "expected", "dynamic", "provenance", "files"], at); requiredString(take.takeId, `${at}.takeId`); if (!idPattern.test(take.takeId)) throw new Error(`${at}.takeId is invalid`);
    if (takeIds.has(take.takeId)) throw new Error(`${at}.takeId must be unique`); takeIds.add(take.takeId);
    keys(take.expected, ["concertPitch", "concertMidi", "referenceFrequencyHz", "verificationMethod", "verifiedAt", "verifiedByAnonymousId"], `${at}.expected`);
    requiredString(take.expected.concertPitch, `${at}.expected.concertPitch`); const pitch = pitchPattern.exec(take.expected.concertPitch); if (!pitch) throw new Error(`${at}.expected.concertPitch is invalid`);
    if (!Number.isInteger(take.expected.concertMidi) || take.expected.concertMidi < 0 || take.expected.concertMidi > 127) throw new Error(`${at}.expected.concertMidi is invalid`);
    if (!(take.expected.referenceFrequencyHz > 0)) throw new Error(`${at}.expected.referenceFrequencyHz must be positive`);
    const accidental = pitch[2] === "#" ? 1 : pitch[2] === "b" ? -1 : 0; const pitchMidi = (Number(pitch[3]) + 1) * 12 + pitchClasses[pitch[1]] + accidental;
    if (pitchMidi !== take.expected.concertMidi) throw new Error(`${at}.expected concertPitch and concertMidi disagree`);
    const referenceCents = 1200 * Math.log2(take.expected.referenceFrequencyHz / (440 * 2 ** ((take.expected.concertMidi - 69) / 12)));
    if (Math.abs(referenceCents) > 100) throw new Error(`${at}.expected referenceFrequencyHz is over 100 cents from concertMidi`);
    oneOf(take.expected.verificationMethod, ["hardware-tuner", "strobe-tuner", "calibrated-reference-instrument"], `${at}.expected.verificationMethod`);
    isoDate(take.expected.verifiedAt, `${at}.expected.verifiedAt`); requiredString(take.expected.verifiedByAnonymousId, `${at}.expected.verifiedByAnonymousId`);
    oneOf(take.dynamic, ["quiet", "medium", "loud"], `${at}.dynamic`); keys(take.provenance, ["originalCapture", "pairingMethod", "processing"], `${at}.provenance`);
    requiredString(take.provenance.originalCapture, `${at}.provenance.originalCapture`); oneOf(take.provenance.pairingMethod, ["simultaneous-recorders", "aac-from-lossless-master"], `${at}.provenance.pairingMethod`);
    const expectedProcessing = take.provenance.pairingMethod === "simultaneous-recorders" ? "none" : "aac-encoded-from-lossless-master"; if (take.provenance.processing !== expectedProcessing) throw new Error(`${at}.provenance.processing must be ${expectedProcessing}`);
    if (!Array.isArray(take.files) || take.files.length !== 2 || new Set(take.files.map(({ role }) => role)).size !== 2 || !take.files.some(({ role }) => role === "lossless") || !take.files.some(({ role }) => role === "aac")) throw new Error(`${at}.files must contain one lossless and one AAC file`);
    const paths = new Set(); for (const [fileIndex, file] of take.files.entries()) {
      const fileAt = `${at}.files[${fileIndex}]`; keys(file, ["role", "path", "container", "codec", "sampleRateHz", "channels", "bytes", "sha256"], fileAt);
      const allowedCodecs = file.role === "lossless" ? ["pcm-s16le", "pcm-s24le", "alac"] : ["aac-lc"]; oneOf(file.codec, allowedCodecs, `${fileAt}.codec`);
      oneOf(file.container, file.role === "lossless" ? ["wav", "caf", "m4a"] : ["m4a"], `${fileAt}.container`); oneOf(file.sampleRateHz, [44100, 48000], `${fileAt}.sampleRateHz`);
      if (file.sampleRateHz !== manifest.capture.sampleRateHz) throw new Error(`${fileAt}.sampleRateHz differs from capture`);
      if (!Number.isInteger(file.channels) || file.channels < 1 || file.channels > 2) throw new Error(`${fileAt}.channels is invalid`);
      if (!Number.isInteger(file.bytes) || file.bytes < 1 || !hashPattern.test(file.sha256)) throw new Error(`${fileAt} bytes or sha256 is invalid`);
      requiredString(file.path, `${fileAt}.path`); const audioPath = await realpath(resolve(root, file.path));
      if (!audioPath.startsWith(`${root}${sep}`)) throw new Error(`${fileAt}.path must stay inside the fixture set`); if (paths.has(audioPath)) throw new Error(`${at}.files must use distinct paths`); paths.add(audioPath);
      const bytes = await readFile(audioPath); if (bytes.length !== file.bytes) throw new Error(`${fileAt}.bytes does not match file`);
      const actualHash = createHash("sha256").update(bytes).digest("hex"); if (actualHash !== file.sha256) throw new Error(`${fileAt}.sha256 does not match file`);
      const probed = await mediaProbe(audioPath); const formats = file.container === "wav" ? ["wav"] : file.container === "caf" ? ["caf"] : ["mov", "mp4", "m4a", "3gp", "3g2", "mj2"]; const codecs = { "pcm-s16le": "pcm_s16le", "pcm-s24le": "pcm_s24le", alac: "alac", "aac-lc": "aac" };
      if (!formats.some((format) => probed.format.split(",").includes(format)) || probed.codec !== codecs[file.codec] || probed.sampleRateHz !== file.sampleRateHz || probed.channels !== file.channels || (file.codec === "aac-lc" && !/LC/i.test(probed.profile))) throw new Error(`${fileAt} declared media metadata does not match ffprobe`);
    }
  }
  if (!Array.isArray(manifest.decoderConsistency)) throw new Error("decoderConsistency must be an array");
  const reports = new Set();
  for (const [index, report] of manifest.decoderConsistency.entries()) {
    const at = `decoderConsistency[${index}]`; keys(report, ["takeId", "decoder", "decoderVersion", "losslessSourceSha256", "aacSourceSha256", "pcmFormat", "channels", "losslessDecodedSha256", "aacDecodedSha256", "sampleRateHz", "losslessDecodedFrames", "aacDecodedFrames", "comparisonStartFrame", "comparedFrames", "aacOffsetFromLosslessFrames", "alignmentMethod", "peakAbsoluteDifference", "rmsDifference", "notes"], at);
    if (!takeIds.has(report.takeId)) throw new Error(`${at}.takeId is unknown`); if (reports.has(report.takeId)) throw new Error(`${at}.takeId has duplicate report`); reports.add(report.takeId);
    requiredString(report.decoder, `${at}.decoder`); requiredString(report.decoderVersion, `${at}.decoderVersion`); const take = manifest.takes.find(({ takeId }) => takeId === report.takeId); const lossless = take.files.find(({ role }) => role === "lossless"); const aac = take.files.find(({ role }) => role === "aac");
    if (report.losslessSourceSha256 !== lossless.sha256 || report.aacSourceSha256 !== aac.sha256) throw new Error(`${at} source hashes do not match take files`);
    if (report.pcmFormat !== "f32le-interleaved-normalized" || report.alignmentMethod !== "whole-frame-cross-correlation") throw new Error(`${at} PCM or alignment method is invalid`);
    if (!Number.isInteger(report.channels) || report.channels !== lossless.channels || report.channels !== aac.channels) throw new Error(`${at}.channels differs from source files`);
    if (!hashPattern.test(report.losslessDecodedSha256) || !hashPattern.test(report.aacDecodedSha256)) throw new Error(`${at} decoded hashes are invalid`);
    if (report.sampleRateHz !== lossless.sampleRateHz || report.sampleRateHz !== aac.sampleRateHz) throw new Error(`${at}.sampleRateHz differs from source files`);
    if (!Number.isInteger(report.losslessDecodedFrames) || !Number.isInteger(report.aacDecodedFrames) || !Number.isInteger(report.comparisonStartFrame) || report.comparisonStartFrame < 0 || !Number.isInteger(report.comparedFrames) || report.comparedFrames < 1 || !Number.isInteger(report.aacOffsetFromLosslessFrames) || report.peakAbsoluteDifference < 0 || report.rmsDifference < 0) throw new Error(`${at} comparison metrics are invalid`);
    const losslessEnd = report.comparisonStartFrame + report.comparedFrames; const aacStart = report.comparisonStartFrame + report.aacOffsetFromLosslessFrames; const aacEnd = aacStart + report.comparedFrames;
    if (losslessEnd > report.losslessDecodedFrames || aacStart < 0 || aacEnd > report.aacDecodedFrames) throw new Error(`${at} comparison window exceeds decoded frames`);
    if (typeof report.notes !== "string") throw new Error(`${at}.notes must be a string`);
  }
  if (reports.size !== takeIds.size) throw new Error("decoderConsistency must contain one report per take");
  return manifest;
}

export function captureChecklist(manifest) {
  const rows = manifest.takes.map((take) => `- [ ] ${take.takeId}: confirm ${take.expected.concertPitch} at ${take.expected.referenceFrequencyHz} Hz by ${take.expected.verificationMethod}; capture ${take.dynamic}; preserve the lossless master and AAC asset; compute hashes; compare decoded PCM.`);
  return `# Capture Checklist: ${manifest.setId}\n\n- [ ] Confirm anonymous consent for project and public-repository use before recording.\n- [ ] Record device, microphone, path, measured distance, room condition, and actual sample rate.\n- [ ] Verify each expected concert pitch independently; do not derive it from a filename or detector output.\n- [ ] Obtain lossless and AAC assets from the same performance take; after an optional declared AAC encoding from the lossless master, do not normalize, trim, denoise, EQ, relabel, or re-encode either asset.\n${rows.join("\n")}\n- [ ] Run \`npm run fixtures:validate -- <manifest.json>\` before review.\n`;
}

async function main() {
  const [manifestPath, option, outputPath] = process.argv.slice(2);
  if (!manifestPath) throw new Error("Usage: npm run fixtures:validate -- <manifest.json> [--checklist <output.md>]");
  const manifest = await validateManifest(manifestPath);
  if (option === "--checklist") { if (!outputPath) throw new Error("--checklist requires an output path"); await writeFile(outputPath, captureChecklist(manifest)); }
  else if (option) throw new Error(`Unknown option ${option}`);
  console.log(`Validated ${manifest.takes.length} paired fixture take(s) in ${manifest.setId}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
