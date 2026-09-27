import { describe, expect, it } from "vitest";
import { coachPitches } from "./coach";
import { instruments } from "./instruments";

function getInstrument(id: string) {
  const instrument = instruments.find((candidate) => candidate.id === id);
  if (!instrument) {
    throw new Error(`Missing instrument definition: ${id}`);
  }
  return instrument;
}

describe("coachPitches", () => {
  it.each([
    ["B-flat trumpet", "bb-trumpet", "E-flat alto saxophone", "eb-alto-saxophone", "D4", "A4"],
    ["E-flat alto saxophone", "eb-alto-saxophone", "F horn", "f-horn", "A4", "G4"],
    ["concert pitch", "concert-pitch", "B-flat clarinet", "bb-clarinet", "C4", "D4"],
    ["F horn", "f-horn", "concert pitch", "concert-pitch", "G4", "C4"],
  ])("derives %s and %s pitches for concert C4 independently", (_player, playerId, _target, targetId, playerName, targetName) => {
    expect(coachPitches(60, getInstrument(playerId), getInstrument(targetId))).toEqual({
      player: expect.objectContaining({ name: playerName }),
      target: expect.objectContaining({ name: targetName }),
    });
  });

  it("does not chain the target conversion through the player's written pitch", () => {
    const { player, target } = coachPitches(61, getInstrument("bb-trumpet"), getInstrument("eb-alto-saxophone"));

    expect(player).toEqual({ midi: 63, name: "E-flat4" });
    expect(target).toEqual({ midi: 70, name: "B-flat4" });
  });

  it("uses the player's concert notation and the target's written spelling", () => {
    const { player, target } = coachPitches(61, getInstrument("concert-pitch"), getInstrument("bb-clarinet"));

    expect(player).toEqual({ midi: 61, name: "C#4" });
    expect(target).toEqual({ midi: 63, name: "E-flat4" });
  });
});
