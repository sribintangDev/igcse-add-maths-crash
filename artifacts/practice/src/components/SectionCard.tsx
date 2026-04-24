import { Link } from "wouter";
import { ArrowRight, BookOpen, Calculator, Clock, FunctionSquare, RefreshCcw, Shuffle, Triangle } from "lucide-react";
import type { SectionId } from "@/data/questions";
import { formatDuration } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SectionCardProps {
  id: SectionId;
  title: string;
  blurb: string;
  attempted: number;
  correct: number;
  mistakes: number;
  total: number;
  /**
   * Average seconds per attempt across this section's recorded timings.
   * `null` means we have no timing data yet (so we render "—" instead of 0s).
   */
  avgSeconds?: number | null;
  disabled?: boolean;
}

const ICONS: Record<SectionId, typeof BookOpen> = {
  algebra: Calculator,
  quadratics: FunctionSquare,
  differentiation: BookOpen,
  trigonometry: Triangle,
  mixed: Shuffle,
  mistakes: RefreshCcw,
};

const ACCENT: Record<SectionId, string> = {
  algebra: "from-chart-1/20 to-chart-1/5 text-chart-1",
  quadratics: "from-chart-2/20 to-chart-2/5 text-chart-2",
  differentiation: "from-chart-4/20 to-chart-4/5 text-chart-4",
  trigonometry: "from-chart-3/20 to-chart-3/5 text-chart-3",
  mixed: "from-primary/20 to-primary/5 text-primary",
  mistakes: "from-chart-5/20 to-chart-5/5 text-chart-5",
};

export function SectionCard({
  id,
  title,
  blurb,
  attempted,
  correct,
  mistakes,
  total,
  avgSeconds = null,
  disabled,
}: SectionCardProps) {
  const Icon = ICONS[id];

  const inner = (
    <Card
      className={`group relative overflow-hidden border border-card-border bg-card p-6 transition-all ${
        disabled ? "cursor-not-allowed opacity-60" : "hover-elevate active-elevate-2 cursor-pointer"
      }`}
      data-testid={`card-section-${id}`}
    >
      <div
        className={`absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br ${ACCENT[id]}`}
        aria-hidden
      />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENT[id]}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          {!disabled && (
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          )}
        </div>
        <div>
          <h3 className="font-serif text-xl font-semibold text-foreground" data-testid={`text-section-title-${id}`}>
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {id === "mistakes" ? (
            <Badge
              variant={mistakes > 0 ? "destructive" : "secondary"}
              data-testid={`badge-mistakes-count-${id}`}
            >
              {mistakes} to redo
            </Badge>
          ) : (
            <>
              <Badge variant="outline" data-testid={`badge-attempted-${id}`}>
                {attempted} / {total} tried
              </Badge>
              <Badge variant="outline" className="border-success/40 text-success" data-testid={`badge-correct-${id}`}>
                {correct} correct
              </Badge>
              {mistakes > 0 && (
                <Badge variant="outline" className="border-destructive/40 text-destructive" data-testid={`badge-mistakes-${id}`}>
                  {mistakes} to redo
                </Badge>
              )}
              {avgSeconds !== null && (
                <Badge
                  variant="outline"
                  className="gap-1 border-border text-muted-foreground"
                  data-testid={`badge-avg-time-${id}`}
                  title="Average time per attempt"
                >
                  <Clock className="h-3 w-3" />
                  avg {formatDuration(avgSeconds)}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );

  if (disabled) return inner;
  return (
    <Link href={`/practice/${id}`} data-testid={`link-section-${id}`}>
      {inner}
    </Link>
  );
}
