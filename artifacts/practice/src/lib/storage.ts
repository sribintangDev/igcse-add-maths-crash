import { useCallback, useEffect, useState } from "react";
import type { Level, SectionId, TopicId } from "@/data/questions";
import { variantGroupsForTopicLevel } from "@/data/questions";

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
  /**
   * Best try-number recorded for MCQ variant questions.
   * 1 = got it right on the first attempt, 2 = second attempt, 3 = three or more.
   * Only the best (lowest) try number is stored per question id.
   */
  mcqTryNumber: Record<string, 1 | 2 | 3>;
  /**
   * Set of variant group ids the student has marked "Confident" on.
   * Once a group is complete it is skipped in future sessions until reset.
   */
  variantGroupComplete: Record<string, true>;
}

const EMPTY: ProgressState = {
  attempted: {},
  correct: {},
  mistakes: {},
  times: {},
  mcqTryNumber: {},
  variantGroupComplete: {},
};

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
      mcqTryNumber: parsed.mcqTryNumber ?? {},
      variantGroupComplete: parsed.variantGroupComplete ?? {},
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
        return { ...s, attempted, correct, mistakes, times };
      });
    },
    [],
  );

  /**
   * Record the best try-number for an MCQ variant question.
   * Lower is better — existing records are only overwritten by a lower value.
   */
  const recordMcqTryNumber = useCallback((questionId: string, tryNumber: 1 | 2 | 3) => {
    setState((s) => {
      const existing = s.mcqTryNumber[questionId];
      if (existing !== undefined && existing <= tryNumber) return s;
      return { ...s, mcqTryNumber: { ...s.mcqTryNumber, [questionId]: tryNumber } };
    });
  }, []);

  /** Mark a variant group as fully completed (student pressed "Confident"). */
  const completeVariantGroup = useCallback((groupId: string) => {
    setState((s) => ({
      ...s,
      variantGroupComplete: { ...s.variantGroupComplete, [groupId]: true },
    }));
  }, []);

  const reset = useCallback(() => {
    setState(() => ({ ...EMPTY }));
  }, []);

  const clearMistakes = useCallback(() => {
    setState((s) => ({ ...s, mistakes: {} }));
  }, []);

  return { state, recordAttempt, recordMcqTryNumber, completeVariantGroup, reset, clearMistakes };
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

/** Returns true if the student has completed (pressed "Confident") for this group. */
export function isGroupComplete(state: ProgressState, groupId: string): boolean {
  return !!state.variantGroupComplete?.[groupId];
}

/**
 * Returns true when every variant group for the given topic + level has been
 * marked "Confident" by the student. Returns false when there are no groups
 * (level not yet available).
 */
export function isLevelComplete(
  state: ProgressState,
  topicId: TopicId,
  level: Level,
): boolean {
  const groupIds = variantGroupsForTopicLevel(topicId, level);
  if (groupIds.length === 0) return false;
  return groupIds.every((id) => isGroupComplete(state, id));
}

/**
 * Returns {done, total} for a list of group ids.
 * `done` = how many the student has marked confident.
 */
export function groupProgress(
  state: ProgressState,
  groupIds: string[],
): { done: number; total: number } {
  let done = 0;
  for (const id of groupIds) {
    if (isGroupComplete(state, id)) done++;
  }
  return { done, total: groupIds.length };
}
