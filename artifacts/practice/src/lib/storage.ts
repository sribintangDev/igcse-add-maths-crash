import { useCallback, useEffect, useState } from "react";
import type { SectionId } from "@/data/questions";

const STORAGE_KEY = "igcse-add-maths-practice/v1";

export interface ProgressState {
  /** Per-question stats: total attempts and number of correct attempts. */
  attempted: Record<string, number>;
  correct: Record<string, number>;
  /** Set (as object) of question ids the student has gotten wrong and not yet redeemed. */
  mistakes: Record<string, true>;
  /**
   * Per-question elapsed-seconds samples. One entry is appended on every
   * first-submit (Practice records the time from when the question first
   * appeared until the student presses Check answer). We keep all samples so
   * a slow question that improves over time is reflected in the average.
   */
  times: Record<string, number[]>;
}

const EMPTY: ProgressState = { attempted: {}, correct: {}, mistakes: {}, times: {} };

function read(): ProgressState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      attempted: parsed.attempted ?? {},
      correct: parsed.correct ?? {},
      mistakes: parsed.mistakes ?? {},
      times: parsed.times ?? {},
    };
  } catch {
    return EMPTY;
  }
}

function write(state: ProgressState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors (private mode, quota)
  }
}

type Listener = (s: ProgressState) => void;
const listeners = new Set<Listener>();
let cache: ProgressState | null = null;

function getState(): ProgressState {
  if (cache === null) cache = read();
  return cache;
}

function setState(updater: (s: ProgressState) => ProgressState): void {
  const next = updater(getState());
  cache = next;
  write(next);
  for (const l of listeners) l(next);
}

export function useProgress() {
  const [state, setLocal] = useState<ProgressState>(() => getState());

  useEffect(() => {
    const l: Listener = (s) => setLocal(s);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  /**
   * Record an attempt. Mistakes are added on any wrong answer and only removed
   * when the question is answered correctly *inside the Mistake Review section*
   * (pass `redemptionMode: true` for that case). Regular section corrects do not
   * clear the mistake — the student still owes that question a deliberate review.
   *
   * `elapsedSeconds` is the time-to-first-submit for the question on this run;
   * pass `null` to skip the timing sample (e.g. test/edge cases).
   */
  const recordAttempt = useCallback(
    (
      questionId: string,
      wasCorrect: boolean,
      redemptionMode = false,
      elapsedSeconds: number | null = null,
    ) => {
      setState((s) => {
        const attempted = { ...s.attempted, [questionId]: (s.attempted[questionId] ?? 0) + 1 };
        const correct = wasCorrect
          ? { ...s.correct, [questionId]: (s.correct[questionId] ?? 0) + 1 }
          : s.correct;
        const mistakes = { ...s.mistakes };
        if (!wasCorrect) {
          mistakes[questionId] = true;
        } else if (redemptionMode) {
          delete mistakes[questionId];
        }
        let times = s.times;
        if (elapsedSeconds !== null && Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0) {
          const prior = s.times[questionId] ?? [];
          times = { ...s.times, [questionId]: [...prior, elapsedSeconds] };
        }
        return { attempted, correct, mistakes, times };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setState(() => ({ ...EMPTY, times: {} }));
  }, []);

  const clearMistakes = useCallback(() => {
    setState((s) => ({ ...s, mistakes: {} }));
  }, []);

  return { state, recordAttempt, reset, clearMistakes };
}

/** Compute headline counters across all questions. */
export function summarise(state: ProgressState) {
  const attemptedCount = Object.keys(state.attempted).length;
  const correctCount = Object.keys(state.correct).length;
  const mistakesCount = Object.keys(state.mistakes).length;
  const totalAttempts = Object.values(state.attempted).reduce((a, b) => a + b, 0);
  const totalCorrect = Object.values(state.correct).reduce((a, b) => a + b, 0);
  const percentage =
    totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);
  return { attemptedCount, correctCount, mistakesCount, totalAttempts, totalCorrect, percentage };
}

/** Per-section counters: how many of that section's questions the student has tried / got right / still owes. */
export function sectionStats(
  state: ProgressState,
  sectionQuestionIds: string[],
): { attempted: number; correct: number; mistakes: number } {
  let attempted = 0;
  let correct = 0;
  let mistakes = 0;
  for (const id of sectionQuestionIds) {
    if (state.attempted[id]) attempted += 1;
    if (state.correct[id]) correct += 1;
    if (state.mistakes[id]) mistakes += 1;
  }
  return { attempted, correct, mistakes };
}

/**
 * Average elapsed seconds across every recorded attempt for the given
 * question ids. Returns `null` when there is no timing data yet so the UI
 * can render a "no data" state instead of a misleading "0s".
 */
export function sectionAverageSeconds(
  state: ProgressState,
  sectionQuestionIds: string[],
): number | null {
  let total = 0;
  let samples = 0;
  for (const id of sectionQuestionIds) {
    const arr = state.times[id];
    if (!arr) continue;
    for (const t of arr) {
      total += t;
      samples += 1;
    }
  }
  if (samples === 0) return null;
  return total / samples;
}

/**
 * Format a duration in seconds for compact UI display: < 60s shows "38s",
 * otherwise "1m 12s". Used for both section cards and session summaries.
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}

export function mistakeIds(state: ProgressState): string[] {
  return Object.keys(state.mistakes);
}

/** Used for the section dot on the home page. */
export function isSectionId(value: string): value is SectionId {
  return [
    "algebra",
    "quadratics",
    "differentiation",
    "trigonometry",
    "mcq",
    "mixed",
    "mistakes",
  ].includes(value);
}
