import type { Grade, SRSState } from "./types.js";

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/**
 * Build the SRS state for a fresh card. Card becomes due immediately.
 *
 * @param now ISO-8601 timestamp; both `due` and (after first review) `lastReviewedAt`
 *            are stored in this format.
 */
export function initialState(now: string): SRSState {
  return {
    interval: 0,
    ease: DEFAULT_EASE,
    repetitions: 0,
    due: now,
  };
}

/**
 * Compute the next SRS state after a review using the SuperMemo-2 algorithm.
 *
 * Units:
 *  - `interval` is in **days** (whole days; rounded for repetitions ≥ 3).
 *  - `due` and `lastReviewedAt` are ISO-8601 timestamps.
 *  - `ease` is a multiplier ≥ 1.3 used to grow `interval` once `repetitions ≥ 3`.
 *
 * Behavior:
 *  - `grade < 3` is a failure: `repetitions` resets to 0, `interval` resets to 1 day.
 *  - `grade ≥ 3` advances: rep 1 → 1 day, rep 2 → 6 days, rep ≥ 3 → previous_interval × ease.
 *  - `ease` is adjusted every review and clamped at MIN_EASE (1.3).
 */
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
