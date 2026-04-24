import type { Question } from "@/data/questions";

/** Normalise a learner's answer into a comparable canonical string. */
export function normalise(input: string): string {
  let s = input.trim().toLowerCase();
  // Convert common typed math characters to canonical forms.
  s = s.replace(/×/g, "*");
  s = s.replace(/÷/g, "/");
  s = s.replace(/−/g, "-"); // unicode minus
  s = s.replace(/–/g, "-"); // en dash
  s = s.replace(/—/g, "-"); // em dash
  s = s.replace(/π/g, "pi");
  s = s.replace(/√/g, "sqrt");
  s = s.replace(/θ/g, "theta");
  s = s.replace(/°/g, "");
  // Remove all whitespace.
  s = s.replace(/\s+/g, "");
  // Remove explicit multiplication signs (3*x and 3x are equivalent).
  s = s.replace(/\*/g, "");
  // Strip a leading variable assignment like "x=", "y=", "p=", "k=", "f'(x)=", "dy/dx=", "f(x)="
  s = s.replace(/^[a-z]'?(\([a-z]\))?=/, "");
  s = s.replace(/^d[a-z]\/d[a-z]=/, "");
  return s;
}

/** Split a comma-separated answer like "x=2,x=-3" into normalised parts. */
function splitParts(answer: string): string[] {
  // Split on commas or " or ".
  const raw = answer.split(/,| or /i);
  return raw
    .map((part) => normalise(part))
    .filter((part) => part.length > 0);
}

function partsEqualUnordered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((v, i) => v === bSorted[i]);
}

export interface GradeResult {
  correct: boolean;
}

export function grade(question: Question, raw: string): GradeResult {
  const learner = normalise(raw);
  if (!learner) return { correct: false };

  // 1) Direct normalised equality with any acceptedAnswer.
  for (const accepted of question.acceptedAnswers) {
    if (normalise(accepted) === learner) {
      return { correct: true };
    }
  }

  // 2) For unordered sets (e.g. quadratic roots), compare comma-separated parts.
  if (question.unorderedSet) {
    const learnerParts = splitParts(raw);
    if (learnerParts.length > 1) {
      for (const accepted of question.acceptedAnswers) {
        const acceptedParts = splitParts(accepted);
        if (acceptedParts.length > 1 && partsEqualUnordered(acceptedParts, learnerParts)) {
          return { correct: true };
        }
      }
    }
  }

  return { correct: false };
}
