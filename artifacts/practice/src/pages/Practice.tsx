import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  XCircle,
} from "lucide-react";
import {
  QUESTIONS,
  SECTION_META,
  type Question,
  type SectionId,
  questionsByIds,
  questionsForSection,
  shuffle,
} from "@/data/questions";
import { grade } from "@/lib/grade";
import { mistakeIds, useProgress } from "@/lib/storage";
import { MathText } from "@/components/Math";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PracticeProps {
  sectionId: SectionId;
}

/**
 * Session modes:
 * - normal: a regular topic-section run; correct answers do NOT clear mistakes
 * - mistakes: the dedicated Mistake Review section; correct answers DO clear
 *   mistakes (redemption)
 * - redo: a "Redo wrong questions" run started either from the end-of-session
 *   summary or from the top of the Mistake Review screen; correct answers DO
 *   clear mistakes (also redemption)
 */
type SessionMode = "normal" | "mistakes" | "redo";

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "bg-success/15 text-success border-success/30",
  Moderate: "bg-chart-3/20 text-chart-3 border-chart-3/40",
  "Exam Style": "bg-chart-4/20 text-chart-4 border-chart-4/40",
};

export default function Practice({ sectionId }: PracticeProps) {
  const meta = SECTION_META[sectionId];
  const [, navigate] = useLocation();
  const { state, recordAttempt } = useProgress();

  /** Build the working queue once on mount. We freeze it so a re-render
   * (e.g. localStorage updates) does not change the order mid-session. */
  const [queue, setQueue] = useState<Question[]>(() => buildQueue(sectionId, state));
  const [mode, setMode] = useState<SessionMode>(() =>
    sectionId === "mistakes" ? "mistakes" : "normal",
  );
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    attempts: 0,
    wrongIds: [] as string[],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const current = queue[index];
  const total = queue.length;

  useEffect(() => {
    setAnswer("");
    setFeedback("idle");
    setSolutionOpen(false);
    if (inputRef.current) inputRef.current.focus();
  }, [index]);

  // After every check (correct OR wrong), bring focus back to the (now
  // read-only) answer input so the student can press Enter to advance, retry,
  // or skip without having to click. Without this, focus stays on the
  // just-clicked button which then unmounts, leaving focus on document.body
  // and silently breaking the keyboard flow.
  useEffect(() => {
    if (feedback !== "idle" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [feedback]);

  if (!meta) {
    return <FallbackMessage title="Section not found" hint="This section does not exist." />;
  }

  if (total === 0) {
    return (
      <FallbackMessage
        title={meta.title}
        hint={
          sectionId === "mistakes"
            ? "You have no mistakes saved yet. Get a question wrong somewhere to fill this list."
            : "No questions are available in this section."
        }
      />
    );
  }

  const restart = (newQueue: Question[], nextMode: SessionMode) => {
    setQueue(newQueue);
    setMode(nextMode);
    setIndex(0);
    setAnswer("");
    setFeedback("idle");
    setSolutionOpen(false);
    setCompleted(false);
    setSessionStats({ correct: 0, attempts: 0, wrongIds: [] });
  };

  const isRedemptionMode = mode === "mistakes" || mode === "redo";

  /** Single dispatcher used by the form so Enter always does the right thing. */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback === "idle") {
      submitAnswer();
    } else if (feedback === "correct") {
      goNext();
    } else if (feedback === "wrong") {
      tryAgain();
    }
  };

  const submitAnswer = () => {
    if (!answer.trim()) return;
    const result = grade(current, answer);
    recordAttempt(current.id, result.correct, isRedemptionMode);
    setFeedback(result.correct ? "correct" : "wrong");
    // After every check, surface the worked solution + accepted answers
    // immediately so the student can study them right away.
    setSolutionOpen(true);
    setSessionStats((s) => ({
      correct: s.correct + (result.correct ? 1 : 0),
      attempts: s.attempts + 1,
      wrongIds: result.correct
        ? s.wrongIds
        : s.wrongIds.includes(current.id)
        ? s.wrongIds
        : [...s.wrongIds, current.id],
    }));
  };

  const goNext = () => {
    if (index + 1 >= total) {
      setCompleted(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  const tryAgain = () => {
    setFeedback("idle");
    setAnswer("");
    setSolutionOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  if (completed) {
    return (
      <SessionSummary
        sectionTitle={meta.title}
        stats={sessionStats}
        total={total}
        onRedoWrong={() => {
          if (sessionStats.wrongIds.length === 0) return;
          restart(questionsByIds(sessionStats.wrongIds), "redo");
        }}
        onRestart={() =>
          restart(buildQueue(sectionId, state), sectionId === "mistakes" ? "mistakes" : "normal")
        }
        onHome={() => navigate("/")}
      />
    );
  }

  const progressValue = Math.round(((index + (feedback !== "idle" ? 1 : 0)) / total) * 100);
  const showRedoBanner = sectionId === "mistakes" && total > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" data-testid="link-back-home">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">All sections</span>
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <p
              className="font-serif text-sm font-semibold text-foreground sm:text-base"
              data-testid="text-section-title"
            >
              {meta.title}
              {mode === "redo" && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">· Redo run</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-question-progress">
              Question {index + 1} of {total}
            </p>
          </div>
          <div className="w-10" />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <Progress value={progressValue} data-testid="progress-section" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {showRedoBanner && (
          <div
            className="mb-5 flex flex-col gap-3 rounded-xl border border-card-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            data-testid="banner-mistake-review"
          >
            <div className="text-sm text-muted-foreground">
              You have <span className="font-semibold text-foreground">{total}</span> question
              {total === 1 ? "" : "s"} to redo. Get one right to remove it from the list.
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 self-start sm:self-auto"
              data-testid="button-redo-wrong-top"
              onClick={() => restart(questionsByIds(mistakeIds(state)), "redo")}
            >
              <RotateCcw className="h-4 w-4" />
              Redo wrong questions
            </Button>
          </div>
        )}

        <Card
          className="border border-card-border bg-card p-6 shadow-sm sm:p-8"
          data-testid={`card-question-${current.id}`}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`${DIFFICULTY_STYLES[current.difficulty]}`}
              data-testid={`badge-difficulty-${current.difficulty
                .toLowerCase()
                .replace(" ", "-")}`}
            >
              {current.difficulty}
            </Badge>
            <Badge variant="secondary" data-testid="badge-topic">
              {current.topic}
            </Badge>
            <span
              className="ml-auto text-xs text-muted-foreground"
              data-testid="text-question-id"
            >
              {current.id}
            </span>
          </div>

          <div className="mb-6 font-serif text-lg leading-relaxed text-foreground sm:text-xl">
            <MathText data-testid="text-question-prompt">{current.question}</MathText>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-3">
            <label
              className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              htmlFor="answer-input"
            >
              Your answer
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                ref={inputRef}
                id="answer-input"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                readOnly={feedback === "correct"}
                className="font-mono text-base"
                autoComplete="off"
                spellCheck={false}
                data-testid="input-answer"
              />
              {feedback === "idle" && (
                <Button type="submit" disabled={!answer.trim()} data-testid="button-check-answer">
                  Check answer
                </Button>
              )}
              {feedback === "wrong" && (
                <>
                  <Button type="submit" variant="secondary" data-testid="button-try-again">
                    Try again
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goNext}
                    data-testid="button-skip-question"
                  >
                    {index + 1 >= total ? "Finish" : "Skip"}
                  </Button>
                </>
              )}
              {feedback === "correct" && (
                <Button type="submit" data-testid="button-next-question">
                  {index + 1 >= total ? "Finish" : "Next question"}
                </Button>
              )}
            </div>
            {feedback === "correct" && (
              <p
                className="text-xs text-muted-foreground"
                data-testid="text-press-enter-hint"
              >
                Press Enter to continue.
              </p>
            )}
          </form>

          {feedback !== "idle" && (
            <div
              className={`mt-5 flex items-start gap-3 rounded-lg border p-4 ${
                feedback === "correct"
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
              data-testid={`feedback-${feedback}`}
            >
              {feedback === "correct" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 flex-none" />
              )}
              <div className="flex-1 text-sm">
                <div className="font-medium">
                  {feedback === "correct"
                    ? "Correct! Well done."
                    : "Not quite — review the worked solution below and try again."}
                </div>
                <div
                  className="mt-1 text-xs opacity-90"
                  data-testid="text-correct-answer-line"
                >
                  Correct answer:{" "}
                  <code className="rounded bg-background/40 px-1.5 py-0.5 font-mono">
                    {current.acceptedAnswers[0]}
                  </code>
                </div>
              </div>
            </div>
          )}

          <Collapsible open={solutionOpen} onOpenChange={setSolutionOpen} className="mt-5">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between border border-dashed border-border text-sm"
                data-testid="button-toggle-solution"
              >
                <span>Worked solution, step by step</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${solutionOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent
              className="mt-3 space-y-3 rounded-lg border border-border bg-muted/40 p-4"
              data-testid="content-solution"
            >
              <ol className="space-y-3 text-sm leading-relaxed text-foreground">
                {current.solution.map((step, i) => (
                  <li key={i} className="flex gap-3" data-testid={`text-solution-step-${i}`}>
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <MathText className="flex-1">{step}</MathText>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <span>Accepted answers:</span>
                {current.acceptedAnswers.map((a) => (
                  <code
                    key={a}
                    className="rounded bg-card px-2 py-0.5 font-mono text-foreground"
                    data-testid={`text-accepted-answer-${a}`}
                  >
                    {a}
                  </code>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

interface SessionSummaryProps {
  sectionTitle: string;
  stats: { correct: number; attempts: number; wrongIds: string[] };
  total: number;
  onRedoWrong: () => void;
  onRestart: () => void;
  onHome: () => void;
}

function SessionSummary({
  sectionTitle,
  stats,
  total,
  onRedoWrong,
  onRestart,
  onHome,
}: SessionSummaryProps) {
  const wrongCount = stats.wrongIds.length;
  const accuracy = stats.attempts === 0 ? 0 : Math.round((stats.correct / stats.attempts) * 100);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onHome}
            className="gap-2 text-muted-foreground"
            data-testid="button-back-home-summary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All sections</span>
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Card
          className="w-full border border-card-border bg-card p-8 text-center shadow-sm"
          data-testid="card-session-summary"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Session complete
          </p>
          <h2
            className="mt-2 font-serif text-3xl font-semibold text-foreground"
            data-testid="text-summary-title"
          >
            {sectionTitle}
          </h2>
          <p
            className="mt-6 font-serif text-6xl font-semibold text-primary"
            data-testid="text-summary-accuracy"
          >
            {accuracy}%
          </p>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-summary-counters">
            {stats.correct} correct out of {stats.attempts} attempts · {total} question
            {total === 1 ? "" : "s"} in this run
          </p>
          {wrongCount > 0 ? (
            <p
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"
              data-testid="text-wrong-count"
            >
              <XCircle className="h-3.5 w-3.5" />
              {wrongCount} question{wrongCount === 1 ? "" : "s"} still needs work
            </p>
          ) : (
            <p
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success"
              data-testid="text-perfect-run"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Perfect run — no mistakes
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={onRedoWrong}
              disabled={wrongCount === 0}
              className="gap-2"
              data-testid="button-redo-wrong"
            >
              <RotateCcw className="h-4 w-4" />
              {wrongCount > 0
                ? `Redo wrong questions (${wrongCount})`
                : "Redo wrong questions"}
            </Button>
            <Button variant="secondary" onClick={onRestart} data-testid="button-restart-section">
              Restart section
            </Button>
            <Button variant="ghost" onClick={onHome} data-testid="button-home-from-summary">
              Back to sections
            </Button>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function FallbackMessage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4 sm:px-6">
          <Link href="/" data-testid="link-back-home-fallback">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>All sections</span>
            </Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <h2
          className="font-serif text-2xl font-semibold text-foreground"
          data-testid="text-fallback-title"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground" data-testid="text-fallback-hint">
          {hint}
        </p>
        <Link href="/" className="mt-6">
          <Button variant="secondary" data-testid="button-fallback-home">
            Go home
          </Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}

function buildQueue(
  sectionId: SectionId,
  state: ReturnType<typeof useProgress>["state"],
): Question[] {
  if (sectionId === "mistakes") {
    return questionsByIds(mistakeIds(state));
  }
  if (sectionId === "mixed") {
    // Stratified sample: 3 random questions from each of the 4 core topics
    // so every Mixed Practice run guarantees full topic coverage. The final
    // 12-question queue is then shuffled so the topic order varies.
    const coreSections: SectionId[] = [
      "algebra",
      "quadratics",
      "differentiation",
      "trigonometry",
    ];
    const picked = coreSections.flatMap((s) =>
      shuffle(questionsForSection(s)).slice(0, 3),
    );
    return shuffle(picked);
  }
  return questionsForSection(sectionId);
}
