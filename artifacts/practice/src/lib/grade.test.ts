import { describe, expect, it } from "vitest";
import { grade, normalise } from "./grade";
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
});
