import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  BarChart2,
  Calculator,
  CheckCircle2,
  ChevronDown,
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
  type Question,
  type TopicId,
  questionsForVariantGroup,
  variantGroupsForTopicLevel,
} from "@/data/questions";
import {
  groupProgress,
  isGroupComplete,
  useProgress,
} from "@/lib/storage";
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

interface DisplayOption {
  key: string;
  text: string;
}

type Phase = "idle" | "wrong" | "correct" | "decision" | "level-done" | "no-questions";

function buildShuffledOptions(q: Question): {
  options: DisplayOption[];
  correctKey: string;
} {
  const entries = Object.entries(q.options ?? {});
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  const LETTERS = ["A", "B", "C", "D"];
  const options: DisplayOption[] = entries.map(([_, text], i) => ({
    key: LETTERS[i],
    text,
  }));
  const correctText = q.options?.[q.correctAnswer ?? ""] ?? "";
  const correctKey = options.find((o) => o.text === correctText)?.key ?? LETTERS[0];
  return { options, correctKey };
}

interface McqPracticeProps {
  topicId: TopicId;
  level: Level;
}

export default function McqPractice({ topicId, level }: McqPracticeProps) {
  const { state, recordMcqTryNumber, completeVariantGroup } = useProgress();
  const meta = TOPIC_META[topicId];
  const Icon = ICONS[meta.iconKey] ?? Calculator;

  const allGroupIds = useMemo(
    () => variantGroupsForTopicLevel(topicId, level),
    [topicId, level],
  );

  const sessionGroupIds = useRef<string[]>(
    allGroupIds.filter((id) => !isGroupComplete(state, id)),
  ).current;

  const initialPhase: Phase = useMemo(() => {
    if (allGroupIds.length === 0) return "no-questions";
    if (sessionGroupIds.length === 0) return "level-done";
    return "idle";
  }, [allGroupIds.length, sessionGroupIds.length]);

  const [groupIndex, setGroupIndex] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [tryNumber, setTryNumber] = useState(1);
  const [shuffledOptions, setShuffledOptions] = useState<DisplayOption[]>([]);
  const [correctKey, setCorrectKey] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [solutionOpen, setSolutionOpen] = useState(false);

  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearAutoTimer(), [clearAutoTimer]);

  const currentGroupId = sessionGroupIds[groupIndex] ?? "";

  const variants = useMemo(
    () => (currentGroupId ? questionsForVariantGroup(currentGroupId) : []),
    [currentGroupId],
  );

  const currentQuestion: Question | null = variants[variantIndex] ?? null;

  const doShuffle = useCallback((q: Question) => {
    const { options, correctKey: ck } = buildShuffledOptions(q);
    setShuffledOptions(options);
    setCorrectKey(ck);
    setSelectedKey("");
  }, []);

  useEffect(() => {
    if (currentQuestion && phase === "idle") {
      doShuffle(currentQuestion);
    }
  }, [currentGroupId, variantIndex]);

  const advanceGroup = useCallback(() => {
    const next = groupIndex + 1;
    if (next >= sessionGroupIds.length) {
      setPhase("level-done");
    } else {
      setGroupIndex(next);
      setVariantIndex(0);
      setTryNumber(1);
      setSolutionOpen(false);
      setPhase("idle");
    }
  }, [groupIndex, sessionGroupIds.length]);

  const handleCheckAnswer = () => {
    if (!selectedKey || !currentQuestion) return;
    const isCorrect = selectedKey === correctKey;

    setSolutionOpen(true);

    if (isCorrect) {
      const cappedTry = Math.min(tryNumber, 3) as 1 | 2 | 3;
      recordMcqTryNumber(currentQuestion.id, cappedTry);

      if (variantIndex === 1) {
        setPhase("decision");
      } else {
        setPhase("correct");
        const nextVariant = variantIndex + 1;
        clearAutoTimer();
        autoTimerRef.current = setTimeout(() => {
          autoTimerRef.current = null;
          if (nextVariant < variants.length) {
            setVariantIndex(nextVariant);
            setTryNumber(1);
            setSolutionOpen(false);
            setPhase("idle");
          } else {
            completeVariantGroup(currentGroupId);
            advanceGroup();
          }
        }, 1500);
      }
    } else {
      setTryNumber((t) => Math.min(t + 1, 3));
      const { options, correctKey: ck } = buildShuffledOptions(currentQuestion);
      setShuffledOptions(options);
      setCorrectKey(ck);
      setSelectedKey("");
      setPhase("wrong");
    }
  };

  const handleTryAgain = () => {
    setPhase("idle");
    setSolutionOpen(false);
  };

  const handleNext = () => {
    const next = variantIndex + 1;
    if (next < variants.length) {
      setVariantIndex(next);
      setTryNumber(1);
      setSolutionOpen(false);
      setPhase("idle");
    } else {
      completeVariantGroup(currentGroupId);
      advanceGroup();
    }
  };

  const handleConfident = () => {
    completeVariantGroup(currentGroupId);
    advanceGroup();
  };

  const handleTryAnother = () => {
    const next = variantIndex + 1;
    if (next < variants.length) {
      setVariantIndex(next);
      setTryNumber(1);
      setSolutionOpen(false);
      setPhase("idle");
    } else {
      completeVariantGroup(currentGroupId);
      advanceGroup();
    }
  };

  const totalSessionGroups = sessionGroupIds.length;
  const progressPct =
    totalSessionGroups === 0 ? 100 : Math.round((groupIndex / totalSessionGroups) * 100);

  if (phase === "no-questions") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SimpleHeader topicId={topicId} meta={meta} Icon={Icon} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent}`}
          >
            <span className="text-2xl">🔜</span>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Coming Soon</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {meta.title} {level} MCQ questions are being prepared. Check back soon!
          </p>
          <Button asChild variant="secondary">
            <Link href={`/topic/${topicId}`}>← Back to {meta.title}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (phase === "level-done") {
    const { done: totalDone, total: total } = groupProgress(state, allGroupIds);
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SimpleHeader topicId={topicId} meta={meta} Icon={Icon} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Trophy className="h-10 w-10" />
          </div>
          <h2 className="font-serif text-3xl font-semibold text-foreground">
            {level} Complete!
          </h2>
          <p className="text-muted-foreground">
            {totalDone === total && total > 0
              ? `All ${total} ${level.toLowerCase()} group${total !== 1 ? "s" : ""} marked confident.`
              : `You've completed this session. ${totalDone} / ${total} groups confident so far.`}
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

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SimpleHeader topicId={topicId} meta={meta} Icon={Icon} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16">
          <p className="text-muted-foreground">Loading question…</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
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
              Group {groupIndex + 1} of {totalSessionGroups} · Q{variantIndex + 1}
              {tryNumber > 1 && (
                <span className="ml-1 opacity-60">(try {tryNumber})</span>
              )}
            </p>
          </div>
          <div className="w-10" />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3 sm:px-6">
          <Progress value={progressPct} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Card className="border border-card-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{meta.title}</Badge>
            <Badge variant="outline" className="border-chart-3/40 bg-chart-3/10 text-chart-3">
              {level}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {currentQuestion.id}
            </span>
          </div>

          <div className="mb-6 font-serif text-xl leading-relaxed text-foreground sm:text-2xl">
            <MathText>{currentQuestion.question}</MathText>
          </div>

          {(phase === "wrong" || phase === "correct" || phase === "decision") && (
            <div
              className={`mb-5 flex items-start gap-3 rounded-lg border p-4 ${
                phase === "wrong"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-success/40 bg-success/10 text-success"
              }`}
              role="status"
              aria-live="polite"
            >
              {phase === "wrong" ? (
                <XCircle className="mt-0.5 h-5 w-5 flex-none" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
              )}
              <div className="flex-1 text-sm">
                <div className="font-medium">
                  {phase === "wrong"
                    ? "Not quite — options reshuffled. Try again!"
                    : phase === "correct"
                    ? "Correct! Loading next question…"
                    : "Correct! How confident are you?"}
                </div>
                {phase === "wrong" && currentQuestion.options && currentQuestion.correctAnswer && (
                  <div className="mt-1 text-xs opacity-80">
                    Answer was:{" "}
                    <span className="font-semibold">
                      <MathText>
                        {currentQuestion.options[currentQuestion.correctAnswer]}
                      </MathText>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shuffledOptions.map((opt) => {
              const isChosen = selectedKey === opt.key;
              const isCorrectOpt = opt.key === correctKey;
              const locked = phase !== "idle";

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
                  key={opt.key}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedKey(opt.key)}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${cls}`}
                  data-testid={`mcq-option-${opt.key}`}
                >
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {opt.key}
                  </span>
                  <span className="text-sm leading-snug">
                    <MathText>{opt.text}</MathText>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            {phase === "idle" && (
              <Button
                size="lg"
                className="h-12 flex-1 text-base"
                disabled={!selectedKey}
                onClick={handleCheckAnswer}
                data-testid="button-check-answer"
              >
                Check answer
              </Button>
            )}
            {phase === "wrong" && (
              <Button
                size="lg"
                variant="secondary"
                className="h-12 flex-1 text-base"
                onClick={handleTryAgain}
                data-testid="button-try-again"
              >
                Try again
              </Button>
            )}
            {phase === "correct" && (
              <div
                className="flex h-12 flex-1 items-center justify-center rounded-lg bg-success/10 text-sm font-medium text-success"
                data-testid="auto-advance-indicator"
              >
                Moving to next question…
              </div>
            )}
            {phase === "decision" && (
              <>
                <Button
                  size="lg"
                  className="h-12 flex-1 text-base"
                  onClick={handleConfident}
                  data-testid="button-confident"
                >
                  ✓ Confident — next topic
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 flex-1 text-base"
                  disabled={variantIndex + 1 >= variants.length}
                  onClick={handleTryAnother}
                  data-testid="button-try-another"
                >
                  Try another
                </Button>
              </>
            )}
          </div>

          {solutionOpen && currentQuestion.solution.length > 0 && (
            <Collapsible defaultOpen className="mt-5 border-t border-card-border pt-4">
              <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                Worked solution
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ol className="mt-3 space-y-2 rounded-xl border border-card-border bg-muted/30 p-4">
                  {currentQuestion.solution.map((step, i) => (
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
      </main>

      <Footer />
    </div>
  );
}

function SimpleHeader({
  topicId,
  meta,
  Icon,
}: {
  topicId: TopicId;
  meta: (typeof TOPIC_META)[TopicId];
  Icon: LucideIcon;
}) {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href={`/topic/${topicId}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{meta.title}</span>
          </Button>
        </Link>
        <div className="flex-1 text-center">
          <p className="font-serif text-sm font-semibold text-foreground sm:text-base">
            {meta.title} MCQ
          </p>
        </div>
        <div className="w-10" />
      </div>
    </header>
  );
}
