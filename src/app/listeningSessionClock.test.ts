import { describe, expect, it } from "vitest";
import { ListeningSessionClock } from "./listeningSessionClock";

describe("ListeningSessionClock", () => {
  it("does not age while a listening session is inactive", () => {
    const clock = new ListeningSessionClock();
    clock.start(1_000);

    expect(clock.now(4_000)).toBe(3_000);
    clock.pause(4_000);
    expect(clock.now(64_000)).toBe(3_000);

    clock.start(64_000);
    expect(clock.now(66_000)).toBe(5_000);
  });

  it("starts a replacement session from zero", () => {
    const clock = new ListeningSessionClock();
    clock.start(1_000);
    clock.pause(5_000);

    clock.reset(100_000);

    expect(clock.now(101_500)).toBe(1_500);
  });
});
