import type { Grade, SRSState } from "./types.js";

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

export function initialState(now: string): SRSState {
  return {
    interval: 0,
    ease: DEFAULT_EASE,
    repetitions: 0,
    due: now,
  };
}

export function schedule(state: SRSState, grade: Grade, now: string): SRSState {
  const easeDelta = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
  const ease = Math.max(MIN_EASE, state.ease + easeDelta);

  if (grade < 3) {
    return {
      interval: 1,
      ease,
      repetitions: 0,
      due: addDays(now, 1),
      lastReviewedAt: now,
    };
  }

  const repetitions = state.repetitions + 1;
  let interval: number;
  if (repetitions === 1) interval = 1;
  else if (repetitions === 2) interval = 6;
  else interval = Math.round(state.interval * ease);

  return {
    interval,
    ease,
    repetitions,
    due: addDays(now, interval),
    lastReviewedAt: now,
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
