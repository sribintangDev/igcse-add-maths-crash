import { Link } from "wouter";
import {
  ArrowRight,
  BarChart2,
  Calculator,
  Clock,
  FunctionSquare,
  Layers,
  Sigma,
  Triangle,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  TOPIC_META,
  TOPICS,
  type Level,
  type TopicId,
  variantGroupsForTopicLevel,
  multiPartSetsForTopicLevel,
} from "@/data/questions";
import { groupProgress, type ProgressState } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LEVELS: Level[] = ["Basic", "Intermediate", "Advanced"];

const ICONS: Record<string, LucideIcon> = {
  calculator: Calculator,
  radical: Sigma,
  function: FunctionSquare,
  "trending-up": TrendingUp,
  "area-chart": BarChart2,
  triangle: Triangle,
  layers: Layers,
};

interface TopicCardProps {
  topicId: TopicId;
  state: ProgressState;
}

export function TopicCard({ topicId, state }: TopicCardProps) {
  const meta = TOPIC_META[topicId];
  const Icon = ICONS[meta.iconKey] ?? Calculator;

  let totalDone = 0;
  let totalGroups = 0;
  for (const level of LEVELS) {
    const ids = [
      ...new Set([
        ...variantGroupsForTopicLevel(topicId, level),
        ...multiPartSetsForTopicLevel(topicId, level).map((s) => s.variantGroup),
      ]),
    ];
    const { done } = groupProgress(state, ids);
    totalDone += done;
    totalGroups += ids.length;
  }

  const hasLinkOverride = !!meta.linkTo;
  const isComingSoon = totalGroups === 0 && !hasLinkOverride;

  const inner = (
    <Card
      className={`group relative overflow-hidden border border-card-border bg-card p-6 transition-all ${
        isComingSoon
          ? "cursor-default opacity-70"
          : "hover-elevate active-elevate-2 cursor-pointer"
      }`}
      data-testid={`card-topic-${topicId}`}
    >
      <div
        className={`absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br ${meta.accent} opacity-60`}
        aria-hidden
      />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          {!isComingSoon && (
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          )}
        </div>
        <div>
          <h3 className="font-serif text-xl font-semibold text-foreground">
            {meta.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isComingSoon ? (
            <Badge variant="secondary">
              <Clock className="mr-1 h-3 w-3" />
              Coming soon
            </Badge>
          ) : (
            <>
              <Badge variant="outline" data-testid={`badge-topic-progress-${topicId}`}>
                {totalDone} / {totalGroups} groups done
              </Badge>
              {totalDone === totalGroups && totalGroups > 0 && (
                <Badge className="border-success/40 bg-success/15 text-success">
                  ✓ Level cleared
                </Badge>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );

  if (isComingSoon) return inner;

  const href = meta.linkTo ?? `/topic/${topicId}`;
  return (
    <Link href={href} data-testid={`link-topic-${topicId}`}>
      {inner}
    </Link>
  );
}

export { TOPICS };
