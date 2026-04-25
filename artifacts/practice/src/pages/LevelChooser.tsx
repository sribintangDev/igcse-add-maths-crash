import { Link } from "wouter";
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  Calculator,
  CheckSquare,
  FunctionSquare,
  Layers,
  Sigma,
  Triangle,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TOPIC_META, type Level, type TopicId, variantGroupsForTopicLevel, multiPartSetsForTopicLevel } from "@/data/questions";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const ICONS: Record<string, LucideIcon> = {
  calculator: Calculator,
  radical: Sigma,
  function: FunctionSquare,
  "trending-up": TrendingUp,
  "area-chart": BarChart2,
  triangle: Triangle,
  layers: Layers,
};

interface LevelChooserProps {
  topicId: TopicId;
  level: Level;
}

export default function LevelChooser({ topicId, level }: LevelChooserProps) {
  const meta = TOPIC_META[topicId];
  const Icon = ICONS[meta.iconKey] ?? Calculator;
  const groupIds = variantGroupsForTopicLevel(topicId, level);
  const multiPartSets = multiPartSetsForTopicLevel(topicId, level);
  const hasMcq = groupIds.length > 0 || multiPartSets.length > 0;
  const mcqGroupCount = groupIds.length > 0 ? groupIds.length : multiPartSets.length;

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
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-start gap-4">
          <div
            className={`flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent}`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
              {meta.title} — {level}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a practice mode.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card
            className={`relative overflow-hidden border border-card-border bg-card p-6 transition-all ${
              hasMcq ? "hover-elevate cursor-pointer" : "cursor-default opacity-60"
            }`}
            data-testid="card-mode-mcq"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckSquare className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    MCQ Practice
                  </h3>
                  {!hasMcq && <Badge variant="secondary">Coming soon</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Multiple-choice drill with smart retry — reshuffle on wrong, follow-up
                  questions, Confident / Try-another checkpoint.
                </p>
                {hasMcq && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {mcqGroupCount} {multiPartSets.length > 0 ? "question set" : "variant group"}{mcqGroupCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            {hasMcq && (
              <Link
                href={`/topic/${topicId}/${level}/mcq`}
                className="absolute inset-0"
                aria-label={`Start ${level} MCQ practice`}
                data-testid="link-mode-mcq"
              />
            )}
          </Card>

          <Card
            className="cursor-default overflow-hidden border border-card-border bg-card p-6 opacity-60"
            data-testid="card-mode-structured"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    Structured Practice
                  </h3>
                  <Badge variant="secondary">Coming soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Short-answer written questions with worked solutions — builds full exam
                  technique.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <Link href={`/topic/${topicId}`}>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to {meta.title}
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
