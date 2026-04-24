import { describe, expect, it } from "vitest";
import { canonicalise, grade, normalise } from "./grade";
import type { Question } from "@/data/questions";

function makeQ(partial: Partial<Question> & Pick<Question, "acceptedAnswers">): Question {
  return {
    id: "test",
    topic: "Algebra Foundations",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Easy",
    question: "stub",
    solution: ["stub"],
    ...partial,
  };
}

describe("normalise", () => {
  it("lowercases, trims and removes whitespace", () => {
    expect(normalise("  3 X + 5 ")).toBe("3x+5");
  });

  it("converts unicode math characters to ASCII forms", () => {
    expect(normalise("3×x")).toBe("3x");
    expect(normalise("6÷2")).toBe("6/2");
    expect(normalise("2−3")).toBe("2-3");
    expect(normalise("2–3")).toBe("2-3");
    expect(normalise("2—3")).toBe("2-3");
  });

  it("rewrites π, √, θ and strips degree marks", () => {
    expect(normalise("2π")).toBe("2pi");
    expect(normalise("√2")).toBe("sqrt2");
    expect(normalise("sin θ")).toBe("sintheta");
    expect(normalise("90°")).toBe("90");
  });

  it("strips explicit multiplication so 3*x equals 3x", () => {
    expect(normalise("3*x")).toBe("3x");
  });

  it("strips a leading variable assignment prefix", () => {
    expect(normalise("x = 5")).toBe("5");
    expect(normalise("y=2x+3")).toBe("2x+3");
    expect(normalise("f(x) = 3x + 1")).toBe("3x+1");
    expect(normalise("f'(x) = 6x")).toBe("6x");
    expect(normalise("dy/dx = 2x")).toBe("2x");
  });

  it("does not strip a non-prefix equals sign", () => {
    // "2x=4" is already canonical (no var-only prefix), keep as-is.
    expect(normalise("2x=4")).toBe("2x=4");
  });
});

describe("grade — direct equality", () => {
  it("accepts the exact accepted answer", () => {
    const q = makeQ({ acceptedAnswers: ["3x+15"] });
    expect(grade(q, "3x+15").correct).toBe(true);
  });

  it("accepts a learner answer with a leading 'x = ' prefix", () => {
    const q = makeQ({ acceptedAnswers: ["5"] });
    expect(grade(q, "x = 5").correct).toBe(true);
  });

  it("accepts a learner answer that uses unicode minus", () => {
    const q = makeQ({ acceptedAnswers: ["-7"] });
    expect(grade(q, "−7").correct).toBe(true);
  });

  it("rejects an empty answer", () => {
    const q = makeQ({ acceptedAnswers: ["3x+15"] });
    expect(grade(q, "   ").correct).toBe(false);
  });

  it("rejects a clearly wrong answer", () => {
    const q = makeQ({ acceptedAnswers: ["3x+15"] });
    expect(grade(q, "3x+14").correct).toBe(false);
  });

  it("considers each accepted answer", () => {
    const q = makeQ({ acceptedAnswers: ["6x-2", "6x - 2", "2(3x-1)"] });
    expect(grade(q, "2(3x-1)").correct).toBe(true);
    expect(grade(q, "6x - 2").correct).toBe(true);
  });
});

describe("grade — unorderedSet (e.g. quadratic roots)", () => {
  const roots = makeQ({
    acceptedAnswers: ["x=2,x=-3", "2,-3"],
    unorderedSet: true,
  });

  it("accepts the canonical order", () => {
    expect(grade(roots, "x=2, x=-3").correct).toBe(true);
  });

  it("accepts the reverse order (unordered)", () => {
    expect(grade(roots, "x=-3, x=2").correct).toBe(true);
  });

  it("accepts a different separator like ' or '", () => {
    expect(grade(roots, "2 or -3").correct).toBe(true);
  });

  it("rejects when one root is wrong", () => {
    expect(grade(roots, "x=2, x=-4").correct).toBe(false);
  });

  it("rejects when an extra root is supplied", () => {
    expect(grade(roots, "2, -3, 4").correct).toBe(false);
  });

  it("does not engage unordered logic when the question is not flagged", () => {
    const q = makeQ({ acceptedAnswers: ["x=2,x=-3"] });
    // Direct equality after normalisation still matches.
    expect(grade(q, "x=2,x=-3").correct).toBe(true);
    // But reverse order is rejected because unorderedSet is not set.
    expect(grade(q, "x=-3,x=2").correct).toBe(false);
  });

  it("uses symbolic equivalence on each unordered part", () => {
    // Roots written as fractions vs. decimals should still pair up.
    const q = makeQ({
      acceptedAnswers: ["x=1/2,x=-3"],
      unorderedSet: true,
    });
    expect(grade(q, "x=-3, x=0.5").correct).toBe(true);
    expect(grade(q, "0.5, -3").correct).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Symbolic equivalence layer.
//
// `canonicalise` returns a normalised polynomial string for the supported
// fragment, or null for inputs we don't model (trig, surds, π, rational
// functions, etc.). Equal canonical strings ⇒ mathematically equivalent.
// ---------------------------------------------------------------------------

describe("canonicalise — rational numbers", () => {
  it("treats 0.5 and 1/2 and 2/4 as the same value", () => {
    const a = canonicalise("0.5");
    const b = canonicalise("1/2");
    const c = canonicalise("2/4");
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it("normalises negative fractions and integers", () => {
    expect(canonicalise("-3")).toBe(canonicalise("-6/2"));
    expect(canonicalise("-0.25")).toBe(canonicalise("-1/4"));
  });

  it("returns null for non-polynomial inputs", () => {
    expect(canonicalise("sqrt2")).toBeNull();
    expect(canonicalise("sintheta")).toBeNull();
    expect(canonicalise("2pi")).toBeNull();
    expect(canonicalise("1/(x+1)")).toBeNull(); // division by non-constant
    expect(canonicalise("x^-2")).toBeNull(); // negative exponent
  });

  it("returns null for malformed inputs instead of throwing", () => {
    // Garbled numbers, dangling operators, unbalanced parens, division by
    // zero, etc. must all fail safely so the grader simply falls back to
    // string equality.
    expect(canonicalise("1..2")).toBeNull();
    expect(canonicalise("(x+1")).toBeNull();
    expect(canonicalise("x+1)")).toBeNull();
    expect(canonicalise("x+")).toBeNull();
    expect(canonicalise("/2")).toBeNull();
    expect(canonicalise("1/0")).toBeNull();
    expect(canonicalise("x^1.5")).toBeNull(); // non-integer exponent
    expect(canonicalise("")).toBeNull();
  });
});

describe("canonicalise — polynomials", () => {
  it("ignores term order", () => {
    expect(canonicalise("x+3")).toBe(canonicalise("3+x"));
    expect(canonicalise("x^2+2x-8")).toBe(canonicalise("x^2-8+2x"));
    expect(canonicalise("x^2+2x-8")).toBe(canonicalise("-8+2x+x^2"));
  });

  it("expands products and powers", () => {
    expect(canonicalise("(x+1)(x-1)")).toBe(canonicalise("x^2-1"));
    expect(canonicalise("(x+1)^2")).toBe(canonicalise("x^2+2x+1"));
    expect(canonicalise("2(3x-1)")).toBe(canonicalise("6x-2"));
  });

  it("merges algebraic fractions with constant denominators", () => {
    // (x-3)/2 + 5/2 = (x+2)/2 = x/2 + 1
    expect(canonicalise("(x-3)/2+5/2")).toBe(canonicalise("(x+2)/2"));
    expect(canonicalise("(x-3)/2+5/2")).toBe(canonicalise("x/2+1"));
  });

  it("ignores variable order in monomials", () => {
    // 3xy + x^2 = x^2 + 3yx
    expect(canonicalise("3xy+x^2")).toBe(canonicalise("x^2+3yx"));
  });

  it("distinguishes genuinely different polynomials", () => {
    expect(canonicalise("x+3")).not.toBe(canonicalise("x+4"));
    expect(canonicalise("x^2+2x-8")).not.toBe(canonicalise("x^2-2x-8"));
  });
});

describe("grade — symbolic equivalence", () => {
  it("accepts 0.5 when 1/2 is the listed answer", () => {
    const q = makeQ({ acceptedAnswers: ["1/2"] });
    expect(grade(q, "0.5").correct).toBe(true);
    expect(grade(q, "2/4").correct).toBe(true);
    expect(grade(q, "0.6").correct).toBe(false);
  });

  it("accepts re-ordered polynomial terms", () => {
    const q = makeQ({ acceptedAnswers: ["x^2+2x-8"] });
    expect(grade(q, "x^2-8+2x").correct).toBe(true);
    expect(grade(q, "-8+2x+x^2").correct).toBe(true);
    expect(grade(q, "2x+x^2-8").correct).toBe(true);
  });

  it("accepts factored vs. expanded forms", () => {
    const q = makeQ({ acceptedAnswers: ["x^2+2x-8"] });
    expect(grade(q, "(x+4)(x-2)").correct).toBe(true);
    expect(grade(q, "(x-2)(x+4)").correct).toBe(true);
  });

  it("accepts a leading 'y = ' on an algebraic answer", () => {
    const q = makeQ({ acceptedAnswers: ["3+x"] });
    expect(grade(q, "y = x + 3").correct).toBe(true);
  });

  it("does not change behaviour for non-polynomial answers", () => {
    // Surds shouldn't be coerced to anything; the existing string layer rules.
    const q = makeQ({ acceptedAnswers: ["sqrt2"] });
    expect(grade(q, "√2").correct).toBe(true);
    expect(grade(q, "1.4142").correct).toBe(false);
  });
});
