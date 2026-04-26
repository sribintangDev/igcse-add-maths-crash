import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Calculator,
  ChevronRight,
  FunctionSquare,
  Lock,
  Sigma,
  Triangle,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  TOPIC_META,
  type Level,
  type TopicId,
  variantGroupsForTopicLevel,
  multiPartSetsForTopicLevel,
} from "@/data/questions";
import { groupProgress, useProgress } from "@/lib/storage";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const ICONS: Record<string, LucideIcon> = {
  calculator: Calculator,
  radical: Sigma,
  function: FunctionSquare,
  "trending-up": TrendingUp,
  "area-chart": BarChart2,
  triangle: Triangle,
};

const LEVELS: Level[] = ["Basic", "Intermediate", "Advanced"];

const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  Basic: "Core concepts and straightforward applications.",
  Intermediate: "Multi-step problems requiring deeper understanding.",
  Advanced: "Exam-style questions and challenging scenarios.",
};

interface TopicHomeProps {
  topicId: TopicId;
}

export default function TopicHome({ topicId }: TopicHomeProps) {
  const { state } = useProgress();
  const meta = TOPIC_META[topicId];
  const Icon = ICONS[meta.iconKey] ?? Calculator;

  const levelData = LEVELS.map((level, i) => {
    const groupIds = [
      ...new Set([
        ...variantGroupsForTopicLevel(topicId, level),
        ...multiPartSetsForTopicLevel(topicId, level).map((s) => s.variantGroup),
      ]),
    ];
    const { done, total } = groupProgress(state, groupIds);
    const isComingSoon = total === 0;

    let isLocked = false;
    if (i > 0) {
      const prevLevel = LEVELS[i - 1];
      const prevGroupIds = [
        ...new Set([
          ...variantGroupsForTopicLevel(topicId, prevLevel),
          ...multiPartSetsForTopicLevel(topicId, prevLevel).map((s) => s.variantGroup),
        ]),
      ];
      const prevProgress = groupProgress(state, prevGroupIds);
      isLocked = prevGroupIds.length > 0 && prevProgress.done < prevGroupIds.length;
    }

    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { level, groupIds, done, total, isComingSoon, isLocked, pct };
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">All topics</span>
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <p className="font-serif text-sm font-semibold text-foreground sm:text-base">
              {meta.title}
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
              {meta.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{meta.blurb}</p>
          </div>
        </div>

        <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">
          Choose a level
        </h2>

        <div className="flex flex-col gap-4">
          {levelData.map(({ level, done, total, isComingSoon, isLocked, pct }) => {
            const canStart = !isLocked && !isComingSoon;

            return (
              <Card
                key={level}
                className={`relative overflow-hidden border border-card-border bg-card p-5 transition-all ${
                  canStart
                    ? "hover-elevate cursor-pointer"
                    : "cursor-default opacity-60"
                }`}
                data-testid={`card-level-${level.toLowerCase()}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-serif text-lg font-semibold text-foreground">
                        {level}
                      </span>
                      {isLocked && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                      {isComingSoon && (
                        <Badge variant="secondary">Coming soon</Badge>
                      )}
                      {!isLocked && !isComingSoon && done === total && total > 0 && (
                        <Badge className="border-success/40 bg-success/15 text-success">
                          ✓ Complete
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {LEVEL_DESCRIPTIONS[level]}
                    </p>
                    {!isComingSoon && (
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={pct} className="flex-1" />
                        <span className="w-16 text-right text-xs text-muted-foreground">
                          {done} / {total} done
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-none">
                    {isLocked ? (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    ) : isComingSoon ? null : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {canStart && (
                  <Link
                    href={`/topic/${topicId}/${level}`}
                    className="absolute inset-0"
                    aria-label={`Choose ${level} practice mode`}
                    data-testid={`link-level-${level.toLowerCase()}`}
                  />
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to all topics
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
