import { describe, expect, it } from "vitest";
import type { SRSState } from "./types.js";
import { schedule, initialState } from "./srs.js";

describe("schedule", () => {
  it("schedules a fresh card with grade 5 to 1 day, ease 2.6, reps 1", () => {
    const before = initialState("2026-05-02T00:00:00Z");
    const after = schedule(before, 5, "2026-05-02T00:00:00Z");

    expect(after.repetitions).toBe(1);
    expect(after.interval).toBe(1);
    expect(after.ease).toBeCloseTo(2.6, 5);
    expect(after.due).toBe("2026-05-03T00:00:00.000Z");
    expect(after.lastReviewedAt).toBe("2026-05-02T00:00:00Z");
  });

  it("on grade 2 (fail), resets repetitions to 0 and interval to 1 day", () => {
    const seasoned: SRSState = {
      interval: 21,
      ease: 2.5,
      repetitions: 5,
      due: "2026-05-02T00:00:00Z",
    };
    const after = schedule(seasoned, 2, "2026-05-02T00:00:00Z");

    expect(after.repetitions).toBe(0);
    expect(after.interval).toBe(1);
    expect(after.due).toBe("2026-05-03T00:00:00.000Z");
    expect(after.ease).toBeCloseTo(2.18, 2);
  });

  it("advances on grade 3 (lowest passing grade) instead of resetting", () => {
    const seasoned: SRSState = {
      interval: 21,
      ease: 2.5,
      repetitions: 5,
      due: "2026-05-02T00:00:00Z",
    };
    const after = schedule(seasoned, 3, "2026-05-02T00:00:00Z");

    expect(after.repetitions).toBe(6);
    expect(after.interval).toBeGreaterThan(1);
  });

  it("transitions interval 1d → 6d on second successful review", () => {
    const oneRep: SRSState = {
      interval: 1,
      ease: 2.6,
      repetitions: 1,
      due: "2026-05-03T00:00:00Z",
    };
    const after = schedule(oneRep, 4, "2026-05-03T00:00:00Z");
    expect(after.interval).toBe(6);
    expect(after.repetitions).toBe(2);
  });

  it("clamps ease at 1.3 even after many failures", () => {
    let s: SRSState = { interval: 0, ease: 1.4, repetitions: 0, due: "2026-05-02T00:00:00Z" };
    for (let i = 0; i < 10; i++) s = schedule(s, 0, "2026-05-02T00:00:00Z");
    expect(s.ease).toBe(1.3);
  });

  it("multiplies interval by ease for repetitions ≥ 3", () => {
    const mature: SRSState = {
      interval: 10,
      ease: 2.5,
      repetitions: 4,
      due: "2026-05-02T00:00:00Z",
    };
    const after = schedule(mature, 5, "2026-05-02T00:00:00Z");
    expect(after.interval).toBe(26);
    expect(after.repetitions).toBe(5);
  });
});
