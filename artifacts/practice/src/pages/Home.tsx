import { useMemo, useState } from "react";
import { GraduationCap, RotateCcw } from "lucide-react";
import {
  QUESTIONS,
  SECTION_META,
  SECTION_ORDER,
  questionsForSection,
} from "@/data/questions";
import { useProgress, summarise, sectionStats, mistakeIds } from "@/lib/storage";
import { Footer } from "@/components/Footer";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const { state, reset, clearMistakes } = useProgress();
  const summary = useMemo(() => summarise(state), [state]);
  const mistakes = mistakeIds(state);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1
                className="font-serif text-lg font-semibold leading-tight text-foreground sm:text-xl"
                data-testid="text-app-title"
              >
                IGCSE Add Maths Crash Practice
              </h1>
              <p className="text-xs text-muted-foreground">3-week revision · self-marking</p>
            </div>
          </div>
          <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                data-testid="button-reset-progress"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset progress</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>What would you like to clear?</AlertDialogTitle>
                <AlertDialogDescription>
                  Choose a scope. There is no undo for either action.
                  <span className="mt-3 block text-foreground">
                    <strong>Clear mistakes only</strong> empties your saved mistakes list but keeps
                    your attempt history.
                  </span>
                  <span className="mt-2 block text-foreground">
                    <strong>Reset everything</strong> wipes attempts, correct counts and mistakes
                    for this browser.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                <AlertDialogCancel data-testid="button-reset-cancel">Cancel</AlertDialogCancel>
                <Button
                  variant="secondary"
                  data-testid="button-clear-mistakes"
                  onClick={() => {
                    clearMistakes();
                    setResetOpen(false);
                  }}
                >
                  Clear mistakes only
                </Button>
                <AlertDialogAction
                  data-testid="button-reset-confirm"
                  onClick={() => {
                    reset();
                    setResetOpen(false);
                  }}
                >
                  Reset everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <section className="mb-10 max-w-3xl">
          <p
            className="font-serif text-2xl leading-snug text-foreground sm:text-3xl"
            data-testid="text-instruction"
          >
            Complete each section, submit your answers, and review the worked solutions immediately
            after checking.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Overall progress
              </p>
              <p className="mt-1 font-serif text-3xl font-semibold text-foreground" data-testid="text-overall-percentage">
                {summary.percentage}%
              </p>
              <p className="mt-1 text-sm text-muted-foreground" data-testid="text-overall-counters">
                {summary.totalCorrect} correct out of {summary.totalAttempts} attempts ·{" "}
                {summary.attemptedCount} of {QUESTIONS.length} questions tried
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <Progress value={summary.percentage} data-testid="progress-overall" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-serif text-xl font-semibold text-foreground">Choose a section</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTION_ORDER.map((id) => {
              const meta = SECTION_META[id];
              const ids =
                id === "mixed"
                  ? QUESTIONS.map((q) => q.id)
                  : id === "mistakes"
                  ? mistakes
                  : questionsForSection(id).map((q) => q.id);
              const stats = sectionStats(state, ids);
              const total = ids.length;
              const disabled = id === "mistakes" && mistakes.length === 0;
              return (
                <SectionCard
                  key={id}
                  id={id}
                  title={meta.title}
                  blurb={meta.blurb}
                  attempted={stats.attempted}
                  correct={stats.correct}
                  mistakes={id === "mistakes" ? mistakes.length : stats.mistakes}
                  total={total}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
