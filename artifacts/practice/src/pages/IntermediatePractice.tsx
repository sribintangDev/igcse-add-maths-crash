import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  BarChart2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FunctionSquare,
  Sigma,
  Triangle,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  TOPIC_META,
  type Level,
  type TopicId,
  multiPartSetsForTopicLevel,
  type MultiPartSet,
} from "@/data/questions";
import { isGroupComplete, useProgress } from "@/lib/storage";
import { MathText } from "@/components/Math";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ICONS: Record<string, LucideIcon> = {
  calculator: Calculator,
  radical: Sigma,
  function: FunctionSquare,
  "trending-up": TrendingUp,
  "area-chart": BarChart2,
  triangle: Triangle,
};

interface AnsweredPart {
  partId: string;
  label: string;
  answerText: string;
  correct: boolean;
  keyValue?: { label: string; value: string };
}

interface PersistedPart {
  selectedKey: string;
  correct: boolean;
  answerText: string;
  keyValue?: { label: string; value: string };
}

function partStorageKey(setId: string, partId: string): string {
  return `intermediate-part-${setId}-${partId}`;
}

function savePartAnswer(setId: string, partId: string, data: PersistedPart): void {
  try {
    localStorage.setItem(partStorageKey(setId, partId), JSON.stringify(data));
  } catch {}
}

function loadPartAnswers(set: MultiPartSet): AnsweredPart[] {
  const results: AnsweredPart[] = [];
  for (const part of set.parts) {
    try {
      const raw = localStorage.getItem(partStorageKey(set.id, part.id));
      if (!raw) break;
      const data = JSON.parse(raw) as PersistedPart;
      results.push({ partId: part.id, label: part.label, ...data });
    } catch {
      break;
    }
  }
  return results;
}

function clearPartAnswers(set: MultiPartSet): void {
  for (const part of set.parts) {
    try {
      localStorage.removeItem(partStorageKey(set.id, part.id));
    } catch {}
  }
}

interface IntermediatePracticeProps {
  topicId: TopicId;
  level: Level;
}

export default function IntermediatePractice({ topicId, level }: IntermediatePracticeProps) {
  const { state, completeVariantGroup } = useProgress();
  const meta = TOPIC_META[topicId];
  const Icon = ICONS[meta.iconKey] ?? Calculator;

  const allSets = useMemo(
    () => multiPartSetsForTopicLevel(topicId, level),
    [topicId, level],
  );

  // Pick one random set per variantGroup that is not yet complete.
  // Grouping first ensures a random variant (not always the first) is selected each session.
  const sessionSets = useRef<MultiPartSet[]>(
    (() => {
      const groupMap = new Map<string, MultiPartSet[]>();
      for (const s of allSets) {
        const arr = groupMap.get(s.variantGroup) ?? [];
        arr.push(s);
        groupMap.set(s.variantGroup, arr);
      }
      const result: MultiPartSet[] = [];
      for (const [group, sets] of groupMap) {
        if (isGroupComplete(state, group)) continue;
        const idx = Math.floor(Math.random() * sets.length);
        result.push(sets[idx]);
      }
      return result;
    })(),
  ).current;

  // Hydrate from localStorage: find how far through the first session set we are.
  const firstSet = sessionSets[0] ?? null;
  const initialAnswered = useRef<AnsweredPart[]>(
    firstSet ? loadPartAnswers(firstSet) : [],
  ).current;
  const allPartsAnswered =
    firstSet !== null && initialAnswered.length === firstSet.parts.length;

  const [setIndex, setSetIndex] = useState(0);
  const [partIndex, setPartIndex] = useState(
    firstSet
      ? Math.min(initialAnswered.length, firstSet.parts.length - 1)
      : 0,
  );
  const [selectedKey, setSelectedKey] = useState("");
  const [checked, setChecked] = useState(false);
  const [answeredParts, setAnsweredParts] = useState<AnsweredPart[]>(initialAnswered);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [mobileAnswersOpen, setMobileAnswersOpen] = useState(false);
  const [phase, setPhase] = useState<"active" | "set-done" | "all-done" | "no-sets">(
    allSets.length === 0
      ? "no-sets"
      : sessionSets.length === 0
      ? "all-done"
      : allPartsAnswered
      ? sessionSets.length === 1
        ? "all-done"
        : "set-done"
      : "active",
  );

  // If all parts were already answered on a previous session and we hydrated into
  // set-done / all-done, ensure the variantGroup is recorded as complete in storage.
  useEffect(() => {
    if (allPartsAnswered && firstSet && !isGroupComplete(state, firstSet.variantGroup)) {
      completeVariantGroup(firstSet.variantGroup);
    }
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSet = sessionSets[setIndex] ?? null;
  const currentPart = currentSet?.parts[partIndex] ?? null;
  const isLastPart = currentSet ? partIndex === currentSet.parts.length - 1 : false;
  const isLastSet = setIndex === sessionSets.length - 1;

  const totalParts = sessionSets.reduce((sum, s) => sum + s.parts.length, 0);
  const completedParts = sessionSets.slice(0, setIndex).reduce((sum, s) => sum + s.parts.length, 0)
    + answeredParts.length;
  const progressPct = totalParts === 0 ? 100 : Math.round((completedParts / totalParts) * 100);

  const isCorrect = checked && selectedKey === currentPart?.correctAnswer;

  function handleCheck() {
    if (!selectedKey || !currentPart || !currentSet) return;
    setChecked(true);
    setSolutionOpen(true);
    const correct = selectedKey === currentPart.correctAnswer;
    const answerText = currentPart.options[selectedKey] ?? selectedKey;
    const kv = correct ? currentPart.keyValue : undefined;
    const newPart: AnsweredPart = {
      partId: currentPart.id,
      label: currentPart.label,
      answerText,
      correct,
      keyValue: kv,
    };
    savePartAnswer(currentSet.id, currentPart.id, { selectedKey, correct, answerText, keyValue: kv });
    setAnsweredParts((prev) => [...prev, newPart]);
    // Record set completion at the moment the last part is answered so it
    // survives any reload before the user clicks "Complete set".
    if (isLastPart) {
      completeVariantGroup(currentSet.variantGroup);
    }
  }

  function handleNext() {
    if (!currentSet) return;
    if (isLastPart) {
      completeVariantGroup(currentSet.variantGroup);
      if (isLastSet) {
        setPhase("all-done");
      } else {
        setPhase("set-done");
      }
    } else {
      setPartIndex((p) => p + 1);
      setSelectedKey("");
      setChecked(false);
      setSolutionOpen(false);
    }
  }

  function handleNextSet() {
    if (currentSet) clearPartAnswers(currentSet);
    const nextIdx = setIndex + 1;
    const nextSet = sessionSets[nextIdx] ?? null;
    const nextAnswered = nextSet ? loadPartAnswers(nextSet) : [];
    setSetIndex(nextIdx);
    setPartIndex(nextSet ? Math.min(nextAnswered.length, nextSet.parts.length - 1) : 0);
    setSelectedKey("");
    setChecked(false);
    setSolutionOpen(false);
    setAnsweredParts(nextAnswered);
    setMobileAnswersOpen(false);
    setPhase("active");
  }

  const keyValues = answeredParts
    .filter((p) => p.correct && p.keyValue)
    .map((p) => p.keyValue!);

  if (phase === "no-sets") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SimpleHeader topicId={topicId} meta={meta} Icon={Icon} level={level} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent}`}>
            <span className="text-2xl">🔜</span>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Coming Soon</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {meta.title} {level} question sets are being prepared. Check back soon!
          </p>
          <Button asChild variant="secondary">
            <Link href={`/topic/${topicId}`}>← Back to {meta.title}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (phase === "all-done") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SimpleHeader topicId={topicId} meta={meta} Icon={Icon} level={level} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Trophy className="h-10 w-10" />
          </div>
          <h2 className="font-serif text-3xl font-semibold text-foreground">
            {level} Complete!
          </h2>
          <p className="text-muted-foreground">
            All {sessionSets.length} question set{sessionSets.length !== 1 ? "s" : ""} finished.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href={`/topic/${topicId}`}>← Back to {meta.title}</Link>
            </Button>
            <Button asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (phase === "set-done") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SimpleHeader topicId={topicId} meta={meta} Icon={Icon} level={level} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Set Complete</h2>
          <p className="text-sm text-muted-foreground">
            Set {setIndex + 1} of {sessionSets.length} done.{" "}
            {isLastSet ? "That's all the sets!" : `${sessionSets.length - setIndex - 1} remaining.`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href={`/topic/${topicId}`}>← Back to {meta.title}</Link>
            </Button>
            {!isLastSet && (
              <Button onClick={handleNextSet}>
                Next set <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!currentSet || !currentPart) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href={`/topic/${topicId}`}>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{meta.title}</span>
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <p className="font-serif text-sm font-semibold text-foreground sm:text-base">
              {meta.title} · {level}
            </p>
            <p className="text-xs text-muted-foreground">
              Set {setIndex + 1} of {sessionSets.length} · Part {partIndex + 1}/{currentSet.parts.length}
            </p>
          </div>
          <div className="w-10" />
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-3 sm:px-6">
          <Progress value={progressPct} />
        </div>
      </header>

      {/* Mobile-only sticky context/graph bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 shadow-sm lg:hidden">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {currentSet.graphExpression ? "Graph" : "Scenario"}
        </p>
        <div className="rounded-lg border border-card-border bg-muted/30 px-4 py-3 text-center text-base font-medium">
          {currentSet.graphExpression ? (
            <MathText block>{currentSet.graphExpression}</MathText>
          ) : (
            <span className="text-sm font-normal text-foreground">
              <MathText>{currentSet.context}</MathText>
            </span>
          )}
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:gap-8">
          {/* ── LEFT PANEL (desktop sticky, mobile hidden within grid) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              {/* Graph / Scenario card */}
              <Card className="border border-card-border bg-card p-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {currentSet.graphExpression ? "Graph" : "Scenario"}
                </p>
                {currentSet.graphExpression ? (
                  <>
                    <div className="rounded-lg border border-card-border bg-muted/30 px-4 py-6 text-center text-lg">
                      <MathText block>{currentSet.graphExpression}</MathText>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      <MathText>{currentSet.context}</MathText>
                    </p>
                  </>
                ) : (
                  <div className="rounded-lg border border-card-border bg-muted/30 px-4 py-4 text-sm leading-relaxed text-foreground">
                    <MathText>{currentSet.context}</MathText>
                  </div>
                )}
              </Card>

              {/* Working summary */}
              {answeredParts.length > 0 && (
                <Card className="border border-card-border bg-card p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Your Working Summary
                  </p>
                  <ul className="space-y-2">
                    {answeredParts.map((p) => (
                      <li key={p.partId} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 flex-none text-base ${p.correct ? "text-success" : "text-destructive"}`}>
                          {p.correct ? "✅" : "❌"}
                        </span>
                        <span className="flex-1">
                          <span className="font-medium text-foreground">{p.label.split("—")[0].trim()}: </span>
                          <span className="text-muted-foreground">
                            <MathText>{p.answerText}</MathText>
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Key values */}
              {keyValues.length > 0 && (
                <Card className="border border-card-border bg-card p-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Key Values
                  </p>
                  <dl className="space-y-1.5">
                    {keyValues.map((kv, i) => (
                      <div key={i} className="flex items-baseline gap-2 text-sm">
                        <dt className="text-muted-foreground">
                          <MathText>{kv.label}</MathText>:
                        </dt>
                        <dd className="font-medium text-foreground">
                          <MathText>{kv.value}</MathText>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}
            </div>
          </aside>

          {/* ── RIGHT PANEL ── */}
          <div className="space-y-4">
            {/* Mobile: collapsible previous answers */}
            {answeredParts.length > 0 && (
              <div className="lg:hidden">
                <Collapsible open={mobileAnswersOpen} onOpenChange={setMobileAnswersOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-card-border bg-card px-4 py-3 text-sm font-medium text-foreground">
                    <span>Show My Previous Answers ({answeredParts.length})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${mobileAnswersOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 rounded-lg border border-card-border bg-card p-4 space-y-2">
                      {answeredParts.map((p) => (
                        <div key={p.partId} className="flex items-start gap-2 text-sm">
                          <span className={`mt-0.5 flex-none ${p.correct ? "text-success" : "text-destructive"}`}>
                            {p.correct ? "✅" : "❌"}
                          </span>
                          <span className="flex-1">
                            <span className="font-medium">{p.label.split("—")[0].trim()}: </span>
                            <span className="text-muted-foreground">
                              <MathText>{p.answerText}</MathText>
                            </span>
                          </span>
                        </div>
                      ))}
                      {keyValues.length > 0 && (
                        <div className="mt-3 border-t border-card-border pt-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Key Values</p>
                          {keyValues.map((kv, i) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="text-muted-foreground"><MathText>{kv.label}</MathText>:</span>
                              <span className="font-medium"><MathText>{kv.value}</MathText></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Question card */}
            <Card className="border border-card-border bg-card p-6 shadow-sm sm:p-8">
              {/* Context line: mobile-only, shown only for graph sets (scenario sets show context in the sticky bar) */}
              {currentSet.graphExpression && (
                <p className="mb-4 text-sm text-muted-foreground lg:hidden">
                  <MathText>{currentSet.context}</MathText>
                </p>
              )}

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{meta.title}</Badge>
                <Badge variant="outline" className="border-chart-3/40 bg-chart-3/10 text-chart-3">
                  {level}
                </Badge>
                <Badge variant="outline" className="ml-auto text-xs">
                  {currentPart.label.split("—")[0].trim()}
                </Badge>
              </div>

              <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {currentPart.label.includes("—") ? currentPart.label.split("—")[1].trim() : currentPart.label}
              </h3>

              <div className="mb-6 font-serif text-xl leading-relaxed text-foreground sm:text-2xl">
                <MathText>{currentPart.question}</MathText>
              </div>

              {/* Feedback banner */}
              {checked && (
                <div
                  className={`mb-5 flex items-start gap-3 rounded-lg border p-4 ${
                    isCorrect
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-destructive/40 bg-destructive/10 text-destructive"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 flex-none" />
                  )}
                  <div className="flex-1 text-sm">
                    <div className="font-medium">
                      {isCorrect ? "Correct!" : "Not quite."}
                    </div>
                    {!isCorrect && (
                      <div className="mt-1 text-xs opacity-80">
                        Correct answer:{" "}
                        <span className="font-semibold">
                          <MathText>{currentPart.options[currentPart.correctAnswer]}</MathText>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(currentPart.options).map(([key, text]) => {
                  const isChosen = selectedKey === key;
                  const isCorrectOpt = key === currentPart.correctAnswer;
                  const locked = checked;

                  let cls = "border-border hover:border-primary hover:bg-accent";
                  if (locked) {
                    if (isCorrectOpt) cls = "border-green-500 bg-green-500/10";
                    else if (isChosen) cls = "border-destructive bg-destructive/10";
                    else cls = "border-border opacity-40";
                  } else if (isChosen) {
                    cls = "border-primary bg-primary/10";
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={locked}
                      onClick={() => setSelectedKey(key)}
                      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${cls}`}
                    >
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {key}
                      </span>
                      <span className="text-sm leading-snug">
                        <MathText>{text}</MathText>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {!checked ? (
                  <Button
                    size="lg"
                    className="h-12 flex-1 text-base"
                    disabled={!selectedKey}
                    onClick={handleCheck}
                  >
                    Check answer
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="h-12 flex-1 text-base"
                    onClick={handleNext}
                  >
                    {isLastPart ? "Complete set" : "Next part"}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Worked solution */}
              {solutionOpen && currentPart.solution.length > 0 && (
                <Collapsible defaultOpen className="mt-5 border-t border-card-border pt-4">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                    Worked solution
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ol className="mt-3 space-y-2 rounded-xl border border-card-border bg-muted/30 p-4">
                      {currentPart.solution.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="text-foreground">
                            <MathText>{step}</MathText>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SimpleHeader({
  topicId,
  meta,
  Icon,
  level,
}: {
  topicId: TopicId;
  meta: (typeof TOPIC_META)[TopicId];
  Icon: LucideIcon;
  level: Level;
}) {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href={`/topic/${topicId}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{meta.title}</span>
          </Button>
        </Link>
        <div className="flex-1 text-center">
          <p className="font-serif text-sm font-semibold text-foreground sm:text-base">
            {meta.title} · {level}
          </p>
        </div>
        <div className="w-10">
          <Icon className="mx-auto h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
