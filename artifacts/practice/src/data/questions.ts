export type Difficulty = "Easy" | "Moderate" | "Exam Style";

export type Level = "Basic" | "Intermediate" | "Advanced";

export type Topic =
  | "Algebra"
  | "Surds"
  | "Quadratics"
  | "Differentiation"
  | "Integration"
  | "Trigonometry"
  | "Mixed";

export type TopicId =
  | "algebra"
  | "surds"
  | "quadratics"
  | "differentiation"
  | "integration"
  | "trigonometry";

export type SectionId =
  | "algebra"
  | "quadratics"
  | "differentiation"
  | "trigonometry"
  | "mcq"
  | "mixed"
  | "mistakes";

/**
 * Declared answer-input type for a question. The current question bank is
 * entirely "short-text" (free-text answers graded against a normalised list of
 * acceptedAnswers). The field is part of the schema so future items
 * (multiple-choice, numeric-only, etc.) can be added without changing the
 * shape of every existing question. The grader switches on this field.
 */
export type QuestionType = "short-text" | "numeric" | "multiple-choice";

export interface Question {
  id: string;
  topic: Topic;
  /**
   * Stable id of the section this question belongs to. Derived from `topic`
   * via TOPIC_TO_SECTION at module load (see below) so it stays in sync.
   */
  section: SectionId;
  questionType: QuestionType;
  difficulty: Difficulty;
  question: string;
  acceptedAnswers: string[];
  /**
   * Option map for multiple-choice questions. Keys are the option letters
   * ("A"–"D") and values are the option text (may contain inline math).
   */
  options?: Record<string, string>;
  /**
   * The correct option key (e.g. "B") for multiple-choice questions.
   * The grader checks this directly; the value is also stored in
   * `acceptedAnswers[0]` for backwards-compatibility with the fallback path.
   */
  correctAnswer?: string;
  solution: string[];
  /**
   * If true, the answer represents a comma-separated set whose order does not matter
   * (e.g. quadratic roots). The grader will also try permutations of comma-separated parts.
   */
  unorderedSet?: boolean;
  /**
   * Optional formula-sheet hint (KaTeX source, no $...$ delimiters) shown
   * in a small card pinned to the top-left of the question card.
   */
  formula?: string;
  /** Short label printed above the formula, e.g. "Quadratic formula". */
  formulaLabel?: string;
  /**
   * Difficulty level for the new topic-based MCQ flow.
   * Basic = entry-level, Intermediate = practise, Advanced = exam-ready.
   */
  level?: Level;
  /**
   * Variant group id for MCQ smart-retry. All questions sharing the same
   * variantGroup id form a set of 2-4 variants used by the retry engine:
   * Q1 → Q2 → "Confident / Try another" → Q3 → Q4.
   */
  variantGroup?: string;
}

export const TOPIC_TO_SECTION: Record<Topic, SectionId> = {
  "Algebra": "algebra",
  "Surds": "algebra",
  Quadratics: "quadratics",
  Differentiation: "differentiation",
  "Integration": "differentiation",
  "Trigonometry": "trigonometry",
  Mixed: "mixed",
};

export const SECTION_META: Record<
  SectionId,
  { id: SectionId; title: string; blurb: string; topic?: Topic }
> = {
  algebra: {
    id: "algebra",
    title: "Algebra",
    blurb: "Expanding, factorising, simplifying, indices and basic equations.",
    topic: "Algebra",
  },
  quadratics: {
    id: "quadratics",
    title: "Quadratics",
    blurb: "Solving, factorising, the quadratic formula and discriminants.",
    topic: "Quadratics",
  },
  differentiation: {
    id: "differentiation",
    title: "Differentiation",
    blurb: "Power rule, tangents, gradients and stationary points.",
    topic: "Differentiation",
  },
  trigonometry: {
    id: "trigonometry",
    title: "Trigonometry",
    blurb: "Exact ratios, identities and basic trig equations.",
    topic: "Trigonometry",
  },
  mcq: {
    id: "mcq",
    title: "MCQ Practice",
    blurb: "Multiple-choice questions across all topics. Pick A, B, C or D.",
  },
  mixed: {
    id: "mixed",
    title: "Mixed Exam Practice",
    blurb: "A shuffled selection drawn from every topic.",
  },
  mistakes: {
    id: "mistakes",
    title: "Mistake Review",
    blurb: "Replay only the questions you got wrong.",
  },
};

export const SECTION_ORDER: SectionId[] = ["mixed", "mistakes"];

export interface TopicMeta {
  id: TopicId;
  title: string;
  blurb: string;
  accent: string;
  iconKey: string;
}

export const TOPIC_META: Record<TopicId, TopicMeta> = {
  algebra: {
    id: "algebra",
    title: "Algebra",
    blurb: "Expand, factorise, simplify and work with indices.",
    accent: "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400",
    iconKey: "calculator",
  },
  surds: {
    id: "surds",
    title: "Surds",
    blurb: "Simplify surds, rationalise denominators and operate with roots.",
    accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    iconKey: "radical",
  },
  quadratics: {
    id: "quadratics",
    title: "Quadratics",
    blurb: "Factorise, use the formula, complete the square and find roots.",
    accent: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400",
    iconKey: "function",
  },
  differentiation: {
    id: "differentiation",
    title: "Differentiation",
    blurb: "Power rule, gradients, stationary points and tangent lines.",
    accent: "from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-400",
    iconKey: "trending-up",
  },
  integration: {
    id: "integration",
    title: "Integration",
    blurb: "Reverse differentiation and find areas under curves.",
    accent: "from-pink-500/20 to-pink-500/5 text-pink-600 dark:text-pink-400",
    iconKey: "area-chart",
  },
  trigonometry: {
    id: "trigonometry",
    title: "Trigonometry",
    blurb: "Exact values, trig equations and the Pythagorean identity.",
    accent: "from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    iconKey: "triangle",
  },
};

export const TOPICS: TopicId[] = [
  "algebra",
  "surds",
  "quadratics",
  "differentiation",
  "integration",
  "trigonometry",
];

/* ================================================================
 * Question bank
 * ================================================================
 * Math is written with KaTeX-friendly $...$ inline delimiters.
 * acceptedAnswers should already be in normalised form preferably,
 * but the grader strips spaces and lowercases automatically and
 * also strips a leading "x=", "y=", "f'(x)=", etc.
 */

export const QUESTIONS: Question[] = [
  /* ---------- ALGEBRA FOUNDATIONS (16) ---------- */
  {
    id: "ALG-001",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Expand $3(x + 5)$.",
    acceptedAnswers: ["3x+15", "15+3x"],
    solution: [
      "Multiply 3 by each term inside the bracket.",
      "$3 \\times x = 3x$ and $3 \\times 5 = 15$.",
      "Final answer: $3x + 15$.",
    ],
  },
  {
    id: "ALG-002",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Expand and simplify $2(x - 3) + 4(x + 1)$.",
    acceptedAnswers: ["6x-2", "-2+6x"],
    solution: [
      "Expand each bracket: $2x - 6$ and $4x + 4$.",
      "Add the like terms: $2x + 4x = 6x$ and $-6 + 4 = -2$.",
      "Final answer: $6x - 2$.",
    ],
  },
  {
    id: "ALG-003",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Factorise $6x + 9$.",
    acceptedAnswers: ["3(2x+3)", "3(3+2x)"],
    solution: [
      "The HCF of 6 and 9 is 3.",
      "Take 3 outside: $3(2x + 3)$.",
      "Final answer: $3(2x + 3)$.",
    ],
  },
  {
    id: "ALG-004",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Solve $4x - 7 = 13$ for $x$.",
    acceptedAnswers: ["5", "x=5"],
    solution: [
      "Add 7 to both sides: $4x = 20$.",
      "Divide both sides by 4: $x = 5$.",
      "Final answer: $x = 5$.",
    ],
  },
  {
    id: "ALG-005",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Simplify $\\dfrac{12x^4}{4x}$.",
    acceptedAnswers: ["3x^3", "3*x^3"],
    solution: [
      "Divide the coefficients: $12 \\div 4 = 3$.",
      "Subtract the indices: $x^{4-1} = x^3$.",
      "Final answer: $3x^3$.",
    ],
  },
  {
    id: "ALG-006",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Expand $(x + 4)(x - 2)$.",
    acceptedAnswers: ["x^2+2x-8", "-8+2x+x^2"],
    solution: [
      "Use FOIL: $x \\cdot x + x \\cdot(-2) + 4 \\cdot x + 4 \\cdot(-2)$.",
      "That gives $x^2 - 2x + 4x - 8$.",
      "Collect like terms: $x^2 + 2x - 8$.",
    ],
  },
  {
    id: "ALG-007",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Factorise fully $2x^2 - 8x$.",
    acceptedAnswers: ["2x(x-4)"],
    solution: [
      "The HCF of $2x^2$ and $8x$ is $2x$.",
      "Take it out: $2x(x - 4)$.",
      "Final answer: $2x(x - 4)$.",
    ],
  },
  {
    id: "ALG-008",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Simplify $\\dfrac{x^2 - 9}{x + 3}$ where $x \\neq -3$.",
    acceptedAnswers: ["x-3"],
    solution: [
      "Recognise the difference of two squares: $x^2 - 9 = (x-3)(x+3)$.",
      "Cancel the common factor $(x + 3)$.",
      "Final answer: $x - 3$.",
    ],
  },
  {
    id: "ALG-009",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Solve $3(x - 2) = 2x + 4$.",
    acceptedAnswers: ["10", "x=10"],
    solution: [
      "Expand the left side: $3x - 6 = 2x + 4$.",
      "Subtract $2x$ from both sides: $x - 6 = 4$.",
      "Add 6 to both sides: $x = 10$.",
    ],
  },
  {
    id: "ALG-010",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Simplify $5\\sqrt{2} + 3\\sqrt{2}$.",
    acceptedAnswers: ["8sqrt(2)", "8sqrt2", "8√2"],
    solution: [
      "These are like surd terms, so add the coefficients.",
      "$5 + 3 = 8$.",
      "Final answer: $8\\sqrt{2}$.",
    ],
  },
  {
    id: "ALG-011",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Evaluate $\\left(\\dfrac{1}{2}\\right)^{-3}$.",
    acceptedAnswers: ["8"],
    solution: [
      "A negative power flips the fraction: $(1/2)^{-3} = 2^3$.",
      "$2^3 = 8$.",
      "Final answer: $8$.",
    ],
  },
  {
    id: "ALG-012",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Simplify $\\dfrac{a^5 \\cdot a^{-2}}{a^{-3}}$.",
    acceptedAnswers: ["a^6"],
    solution: [
      "Add indices in the numerator: $a^{5 + (-2)} = a^3$.",
      "Now divide: $a^{3 - (-3)} = a^{3+3} = a^6$.",
      "Final answer: $a^6$.",
    ],
  },
  {
    id: "ALG-013",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Solve the simultaneous equations $2x + y = 7$ and $x - y = 2$. Give your answer as $x,y$.",
    acceptedAnswers: ["3,1", "x=3,y=1"],
    solution: [
      "Add the two equations to eliminate $y$: $3x = 9$.",
      "So $x = 3$.",
      "Substitute back: $3 - y = 2 \\Rightarrow y = 1$.",
      "Final answer: $x = 3,\\ y = 1$.",
    ],
  },
  {
    id: "ALG-014",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Make $r$ the subject of the formula $A = \\pi r^2$ (take the positive root).",
    acceptedAnswers: ["sqrt(a/pi)", "(a/pi)^(1/2)", "√(a/π)"],
    solution: [
      "Divide both sides by $\\pi$: $\\dfrac{A}{\\pi} = r^2$.",
      "Take the positive square root.",
      "Final answer: $r = \\sqrt{\\dfrac{A}{\\pi}}$.",
    ],
  },
  {
    id: "ALG-015",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Exam Style",
    question: "Simplify $\\dfrac{2}{x} + \\dfrac{3}{x+1}$ as a single fraction.",
    acceptedAnswers: ["(5x+2)/(x(x+1))", "(5x+2)/(x^2+x)"],
    solution: [
      "Common denominator is $x(x+1)$.",
      "$\\dfrac{2(x+1)}{x(x+1)} + \\dfrac{3x}{x(x+1)} = \\dfrac{2x + 2 + 3x}{x(x+1)}$.",
      "Combine: $\\dfrac{5x + 2}{x(x+1)}$.",
    ],
  },
  {
    id: "ALG-016",
    topic: "Algebra",
    section: "algebra",
    questionType: "short-text",
    difficulty: "Exam Style",
    question: "Solve $\\dfrac{x+1}{2} - \\dfrac{x-3}{4} = 2$.",
    acceptedAnswers: ["3", "x=3"],
    solution: [
      "Multiply every term by 4: $2(x+1) - (x-3) = 8$.",
      "Expand: $2x + 2 - x + 3 = 8$.",
      "Simplify: $x + 5 = 8$, so $x = 3$.",
    ],
  },

  /* ---------- QUADRATICS (16) ---------- */
  {
    id: "QUA-001",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Factorise $x^2 + 7x + 12$.",
    acceptedAnswers: ["(x+3)(x+4)", "(x+4)(x+3)"],
    solution: [
      "Look for two numbers that multiply to $12$ and add to $7$.",
      "$3$ and $4$ work.",
      "Final answer: $(x + 3)(x + 4)$.",
    ],
  },
  {
    id: "QUA-002",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Factorise $x^2 - 5x + 6$.",
    acceptedAnswers: ["(x-2)(x-3)", "(x-3)(x-2)"],
    solution: [
      "Find two numbers that multiply to $6$ and add to $-5$.",
      "$-2$ and $-3$ fit.",
      "Final answer: $(x - 2)(x - 3)$.",
    ],
  },
  {
    id: "QUA-003",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Solve $x^2 = 49$. Give both solutions, separated by a comma.",
    acceptedAnswers: ["7,-7", "x=7,x=-7"],
    unorderedSet: true,
    solution: [
      "Take the square root of both sides.",
      "$x = \\pm 7$.",
      "Final answer: $x = 7$ or $x = -7$.",
    ],
  },
  {
    id: "QUA-004",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Solve $(x - 2)(x + 5) = 0$. Give both solutions, separated by a comma.",
    acceptedAnswers: ["2,-5", "x=2,x=-5"],
    unorderedSet: true,
    solution: [
      "Set each factor equal to zero.",
      "$x - 2 = 0 \\Rightarrow x = 2$ and $x + 5 = 0 \\Rightarrow x = -5$.",
      "Final answer: $x = 2$ or $x = -5$.",
    ],
  },
  {
    id: "QUA-005",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Solve $x^2 - 6x + 8 = 0$. Give both solutions, separated by a comma.",
    acceptedAnswers: ["2,4", "x=2,x=4"],
    unorderedSet: true,
    solution: [
      "Factorise: $(x - 2)(x - 4) = 0$.",
      "So $x = 2$ or $x = 4$.",
      "Final answer: $x = 2$ or $x = 4$.",
    ],
  },
  {
    id: "QUA-006",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Solve $2x^2 + 5x - 3 = 0$. Give both solutions, separated by a comma.",
    acceptedAnswers: ["1/2,-3", "0.5,-3", "x=1/2,x=-3"],
    unorderedSet: true,
    solution: [
      "Factorise: $(2x - 1)(x + 3) = 0$.",
      "$2x - 1 = 0 \\Rightarrow x = \\tfrac{1}{2}$.",
      "$x + 3 = 0 \\Rightarrow x = -3$.",
      "Final answer: $x = \\tfrac{1}{2}$ or $x = -3$.",
    ],
  },
  {
    id: "QUA-007",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Use the quadratic formula to find the roots of $x^2 + 2x - 5 = 0$. Give the exact answer, separated by a comma.",
    acceptedAnswers: ["-1+sqrt(6),-1-sqrt(6)", "-1+√6,-1-√6"],
    unorderedSet: true,
    formulaLabel: "Quadratic formula",
    formula: "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    solution: [
      "$a = 1,\\ b = 2,\\ c = -5$.",
      "Discriminant: $b^2 - 4ac = 4 + 20 = 24$.",
      "$x = \\dfrac{-2 \\pm \\sqrt{24}}{2} = -1 \\pm \\sqrt{6}$.",
      "Final answer: $x = -1 + \\sqrt{6}$ or $x = -1 - \\sqrt{6}$.",
    ],
  },
  {
    id: "QUA-008",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Find the discriminant of $3x^2 - 4x + 1 = 0$.",
    acceptedAnswers: ["4"],
    formulaLabel: "Discriminant",
    formula: "\\Delta = b^2 - 4ac",
    solution: [
      "$\\Delta = b^2 - 4ac$.",
      "$\\Delta = (-4)^2 - 4(3)(1) = 16 - 12 = 4$.",
      "Final answer: $\\Delta = 4$.",
    ],
  },
  {
    id: "QUA-009",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Complete the square for $x^2 + 6x + 5$.",
    acceptedAnswers: ["(x+3)^2-4"],
    formulaLabel: "Completing the square",
    formula: "x^2 + bx = \\left(x + \\tfrac{b}{2}\\right)^2 - \\left(\\tfrac{b}{2}\\right)^2",
    solution: [
      "Take half the coefficient of $x$: half of $6$ is $3$.",
      "Write $(x + 3)^2 = x^2 + 6x + 9$.",
      "Adjust constant: $x^2 + 6x + 5 = (x + 3)^2 - 9 + 5 = (x + 3)^2 - 4$.",
    ],
  },
  {
    id: "QUA-010",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Find the coordinates of the minimum point of $y = x^2 - 4x + 1$. Give your answer as $x,y$.",
    acceptedAnswers: ["2,-3", "(2,-3)"],
    formulaLabel: "Completing the square",
    formula: "x^2 + bx = \\left(x + \\tfrac{b}{2}\\right)^2 - \\left(\\tfrac{b}{2}\\right)^2",
    solution: [
      "Complete the square: $y = (x - 2)^2 - 4 + 1 = (x - 2)^2 - 3$.",
      "Minimum occurs when $(x - 2)^2 = 0$, i.e. $x = 2$.",
      "Then $y = -3$.",
      "Final answer: $(2, -3)$.",
    ],
  },
  {
    id: "QUA-011",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Solve $x^2 - 4x - 12 = 0$. Give both solutions, separated by a comma.",
    acceptedAnswers: ["6,-2", "x=6,x=-2"],
    unorderedSet: true,
    solution: [
      "Factorise: $(x - 6)(x + 2) = 0$.",
      "So $x = 6$ or $x = -2$.",
      "Final answer: $x = 6$ or $x = -2$.",
    ],
  },
  {
    id: "QUA-012",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "The roots of $x^2 + px + 12 = 0$ are $-2$ and $-6$. Find the value of $p$.",
    acceptedAnswers: ["8", "p=8"],
    formulaLabel: "Sum & product of roots",
    formula: "\\alpha + \\beta = -\\tfrac{b}{a},\\quad \\alpha\\beta = \\tfrac{c}{a}",
    solution: [
      "Sum of roots = $-p$, so $-2 + (-6) = -p \\Rightarrow -8 = -p$.",
      "Therefore $p = 8$.",
      "Check product: $(-2)(-6) = 12$ ✓.",
      "Final answer: $p = 8$.",
    ],
  },
  {
    id: "QUA-013",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "For what values of $k$ does $x^2 + kx + 9 = 0$ have equal roots? Give both, separated by a comma.",
    acceptedAnswers: ["6,-6", "k=6,k=-6"],
    unorderedSet: true,
    formulaLabel: "Equal roots: discriminant = 0",
    formula: "b^2 - 4ac = 0",
    solution: [
      "Equal roots require discriminant $= 0$.",
      "$k^2 - 4(1)(9) = 0 \\Rightarrow k^2 = 36$.",
      "So $k = \\pm 6$.",
      "Final answer: $k = 6$ or $k = -6$.",
    ],
  },
  {
    id: "QUA-014",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Express $2x^2 - 8x + 3$ in the form $a(x + b)^2 + c$. Give your answer as the expression.",
    acceptedAnswers: ["2(x-2)^2-5"],
    formulaLabel: "Completing the square",
    formula: "x^2 + bx = \\left(x + \\tfrac{b}{2}\\right)^2 - \\left(\\tfrac{b}{2}\\right)^2",
    solution: [
      "Factor 2 from the $x$ terms: $2(x^2 - 4x) + 3$.",
      "Complete the square inside: $x^2 - 4x = (x - 2)^2 - 4$.",
      "Substitute back: $2[(x - 2)^2 - 4] + 3 = 2(x - 2)^2 - 8 + 3$.",
      "Simplify: $2(x - 2)^2 - 5$.",
    ],
  },
  {
    id: "QUA-015",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Find the values of $x$ where $y = x^2 - 3x - 4$ crosses the x-axis. Give both, separated by a comma.",
    acceptedAnswers: ["4,-1", "x=4,x=-1"],
    unorderedSet: true,
    solution: [
      "Set $y = 0$: $x^2 - 3x - 4 = 0$.",
      "Factorise: $(x - 4)(x + 1) = 0$.",
      "So $x = 4$ or $x = -1$.",
      "Final answer: $x = 4$ or $x = -1$.",
    ],
  },
  {
    id: "QUA-016",
    topic: "Quadratics",
    section: "quadratics",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Find the values of $x$ for which $x^2 - x - 6 < 0$. Use interval notation, e.g. $-2<x<3$.",
    acceptedAnswers: ["-2<x<3", "x>-2andx<3", "x∈(-2,3)"],
    solution: [
      "Factorise: $(x - 3)(x + 2) < 0$.",
      "Roots at $x = -2$ and $x = 3$. The parabola opens up, so it is negative between the roots.",
      "Final answer: $-2 < x < 3$.",
    ],
  },

  /* ---------- DIFFERENTIATION (16) ---------- */
  {
    id: "DIF-001",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Differentiate $y = x^4$ with respect to $x$.",
    acceptedAnswers: ["4x^3", "dy/dx=4x^3"],
    formulaLabel: "Power rule",
    formula: "\\dfrac{d}{dx}\\left(x^n\\right) = n\\,x^{n-1}",
    solution: [
      "Bring the power down and reduce by 1.",
      "$\\dfrac{dy}{dx} = 4x^{4-1} = 4x^3$.",
      "Final answer: $\\dfrac{dy}{dx} = 4x^3$.",
    ],
  },
  {
    id: "DIF-002",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Differentiate $y = 5x$.",
    acceptedAnswers: ["5", "dy/dx=5"],
    solution: [
      "The derivative of $cx$ is just $c$.",
      "Final answer: $\\dfrac{dy}{dx} = 5$.",
    ],
  },
  {
    id: "DIF-003",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Differentiate $y = 7$.",
    acceptedAnswers: ["0", "dy/dx=0"],
    solution: [
      "The derivative of any constant is $0$.",
      "Final answer: $\\dfrac{dy}{dx} = 0$.",
    ],
  },
  {
    id: "DIF-004",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Differentiate $y = 3x^2 + 2x - 1$.",
    acceptedAnswers: ["6x+2", "dy/dx=6x+2"],
    formulaLabel: "Power rule",
    formula: "\\dfrac{d}{dx}\\left(x^n\\right) = n\\,x^{n-1}",
    solution: [
      "Differentiate term-by-term.",
      "$3x^2 \\to 6x$, $2x \\to 2$, $-1 \\to 0$.",
      "Final answer: $\\dfrac{dy}{dx} = 6x + 2$.",
    ],
  },
  {
    id: "DIF-005",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Differentiate $f(x) = x^3 - 4x$.",
    acceptedAnswers: ["3x^2-4", "f'(x)=3x^2-4"],
    formulaLabel: "Power rule",
    formula: "\\dfrac{d}{dx}\\left(x^n\\right) = n\\,x^{n-1}",
    solution: [
      "Differentiate term-by-term.",
      "$x^3 \\to 3x^2$ and $-4x \\to -4$.",
      "Final answer: $f'(x) = 3x^2 - 4$.",
    ],
  },
  {
    id: "DIF-006",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Differentiate $y = \\dfrac{1}{x}$.",
    acceptedAnswers: ["-1/x^2", "-x^-2", "-x^(-2)"],
    formulaLabel: "Power rule",
    formula: "\\dfrac{d}{dx}\\left(x^n\\right) = n\\,x^{n-1}",
    solution: [
      "Rewrite: $y = x^{-1}$.",
      "Differentiate: $\\dfrac{dy}{dx} = -1 \\cdot x^{-2} = -\\dfrac{1}{x^2}$.",
      "Final answer: $-\\dfrac{1}{x^2}$.",
    ],
  },
  {
    id: "DIF-007",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Differentiate $y = \\sqrt{x}$.",
    acceptedAnswers: ["1/(2sqrt(x))", "1/(2√x)", "(1/2)x^(-1/2)"],
    formulaLabel: "Power rule",
    formula: "\\dfrac{d}{dx}\\left(x^n\\right) = n\\,x^{n-1}",
    solution: [
      "Rewrite as $y = x^{1/2}$.",
      "Differentiate: $\\dfrac{dy}{dx} = \\tfrac{1}{2}x^{-1/2}$.",
      "Final answer: $\\dfrac{1}{2\\sqrt{x}}$.",
    ],
  },
  {
    id: "DIF-008",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Find $f'(x)$ for $f(x) = 2x^3 - 5x^2 + x - 6$.",
    acceptedAnswers: ["6x^2-10x+1", "f'(x)=6x^2-10x+1"],
    formulaLabel: "Power rule",
    formula: "\\dfrac{d}{dx}\\left(x^n\\right) = n\\,x^{n-1}",
    solution: [
      "Differentiate each term.",
      "$2x^3 \\to 6x^2$, $-5x^2 \\to -10x$, $x \\to 1$, $-6 \\to 0$.",
      "Final answer: $f'(x) = 6x^2 - 10x + 1$.",
    ],
  },
  {
    id: "DIF-009",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Find the gradient of $y = x^2 - 3x$ at $x = 4$.",
    acceptedAnswers: ["5"],
    solution: [
      "Differentiate: $\\dfrac{dy}{dx} = 2x - 3$.",
      "Substitute $x = 4$: $2(4) - 3 = 5$.",
      "Final answer: gradient $= 5$.",
    ],
  },
  {
    id: "DIF-010",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Find the equation of the tangent to $y = x^2$ at the point $(3, 9)$. Give it in the form $y=mx+c$.",
    acceptedAnswers: ["y=6x-9"],
    formulaLabel: "Tangent at a point",
    formula: "y - y_1 = m\\,(x - x_1),\\ \\ m = \\left.\\dfrac{dy}{dx}\\right|_{x_1}",
    solution: [
      "Differentiate: $\\dfrac{dy}{dx} = 2x$. At $x = 3$, gradient $= 6$.",
      "Use $y - y_1 = m(x - x_1)$: $y - 9 = 6(x - 3)$.",
      "Expand: $y = 6x - 18 + 9 = 6x - 9$.",
    ],
  },
  {
    id: "DIF-011",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Find the x-coordinate of the stationary point of $y = x^2 - 8x + 3$.",
    acceptedAnswers: ["4", "x=4"],
    solution: [
      "Differentiate: $\\dfrac{dy}{dx} = 2x - 8$.",
      "Set equal to 0: $2x - 8 = 0 \\Rightarrow x = 4$.",
      "Final answer: $x = 4$.",
    ],
  },
  {
    id: "DIF-012",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Find the x-coordinates of the stationary points of $y = x^3 - 3x^2 - 9x + 1$. Give both, separated by a comma.",
    acceptedAnswers: ["3,-1", "x=3,x=-1"],
    unorderedSet: true,
    solution: [
      "Differentiate: $\\dfrac{dy}{dx} = 3x^2 - 6x - 9$.",
      "Set $= 0$: $3(x^2 - 2x - 3) = 0 \\Rightarrow (x - 3)(x + 1) = 0$.",
      "So $x = 3$ or $x = -1$.",
    ],
  },
  {
    id: "DIF-013",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Find $\\dfrac{d^2y}{dx^2}$ when $y = 4x^3 - x^2 + 7$.",
    acceptedAnswers: ["24x-2"],
    solution: [
      "First derivative: $\\dfrac{dy}{dx} = 12x^2 - 2x$.",
      "Differentiate again: $\\dfrac{d^2y}{dx^2} = 24x - 2$.",
      "Final answer: $24x - 2$.",
    ],
  },
  {
    id: "DIF-014",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Find the gradient of the tangent to $y = 2x^3 - 5x$ at the point where $x = -1$.",
    acceptedAnswers: ["1"],
    solution: [
      "Differentiate: $\\dfrac{dy}{dx} = 6x^2 - 5$.",
      "At $x = -1$: $6(1) - 5 = 1$.",
      "Final answer: gradient $= 1$.",
    ],
  },
  {
    id: "DIF-015",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "A curve has equation $y = x^3 - 12x + 4$. Find the y-coordinate of the local maximum.",
    acceptedAnswers: ["20", "y=20"],
    solution: [
      "Differentiate: $\\dfrac{dy}{dx} = 3x^2 - 12 = 0 \\Rightarrow x = \\pm 2$.",
      "Second derivative: $\\dfrac{d^2y}{dx^2} = 6x$. At $x = -2$ this is $-12 < 0$, so $x = -2$ is the max.",
      "Substitute: $y = (-2)^3 - 12(-2) + 4 = -8 + 24 + 4 = 20$.",
    ],
  },
  {
    id: "DIF-016",
    topic: "Differentiation",
    section: "differentiation",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Find the equation of the normal to $y = x^2 + 1$ at the point $(1, 2)$. Give it in the form $y=mx+c$.",
    acceptedAnswers: ["y=-x/2+5/2", "y=-(1/2)x+5/2", "y=-0.5x+2.5"],
    formulaLabel: "Normal at a point",
    formula: "m_{\\text{normal}} = -\\dfrac{1}{m_{\\text{tangent}}}",
    solution: [
      "Differentiate: $\\dfrac{dy}{dx} = 2x$. Tangent gradient at $x = 1$ is $2$.",
      "Normal gradient $= -\\dfrac{1}{2}$.",
      "Use $y - 2 = -\\dfrac{1}{2}(x - 1)$: $y = -\\tfrac{1}{2}x + \\tfrac{1}{2} + 2 = -\\tfrac{1}{2}x + \\tfrac{5}{2}$.",
    ],
  },

  /* ---------- TRIGONOMETRY SURVIVAL (16) ---------- */
  {
    id: "TRI-001",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Evaluate $\\sin 30°$. Give the exact value as a fraction.",
    acceptedAnswers: ["1/2", "0.5"],
    solution: [
      "From the standard exact values, $\\sin 30° = \\tfrac{1}{2}$.",
      "Final answer: $\\tfrac{1}{2}$.",
    ],
  },
  {
    id: "TRI-002",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Evaluate $\\cos 60°$. Give the exact value as a fraction.",
    acceptedAnswers: ["1/2", "0.5"],
    solution: [
      "From the standard exact values, $\\cos 60° = \\tfrac{1}{2}$.",
      "Final answer: $\\tfrac{1}{2}$.",
    ],
  },
  {
    id: "TRI-003",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Easy",
    question: "Evaluate $\\tan 45°$.",
    acceptedAnswers: ["1"],
    solution: [
      "From the standard exact values, $\\tan 45° = 1$.",
      "Final answer: $1$.",
    ],
  },
  {
    id: "TRI-004",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Easy",
    question:
      "Evaluate $\\sin 60°$. Give the exact value (use $\\sqrt{3}$ where needed).",
    acceptedAnswers: ["sqrt(3)/2", "√3/2", "(sqrt3)/2"],
    solution: [
      "From the standard exact values, $\\sin 60° = \\dfrac{\\sqrt{3}}{2}$.",
      "Final answer: $\\dfrac{\\sqrt{3}}{2}$.",
    ],
  },
  {
    id: "TRI-005",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Easy",
    question:
      "In a right-angled triangle, the opposite side is 3 and the hypotenuse is 5. Find $\\sin\\theta$.",
    acceptedAnswers: ["3/5", "0.6"],
    solution: [
      "$\\sin\\theta = \\dfrac{\\text{opposite}}{\\text{hypotenuse}}$.",
      "$\\sin\\theta = \\dfrac{3}{5}$.",
      "Final answer: $\\tfrac{3}{5}$.",
    ],
  },
  {
    id: "TRI-006",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Simplify $\\sin^2\\theta + \\cos^2\\theta$.",
    acceptedAnswers: ["1"],
    formulaLabel: "Pythagorean identity",
    formula: "\\sin^2\\theta + \\cos^2\\theta = 1",
    solution: [
      "This is the Pythagorean identity.",
      "$\\sin^2\\theta + \\cos^2\\theta = 1$ for all $\\theta$.",
      "Final answer: $1$.",
    ],
  },
  {
    id: "TRI-007",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "If $\\sin\\theta = \\dfrac{4}{5}$ and $\\theta$ is acute, find $\\cos\\theta$.",
    acceptedAnswers: ["3/5", "0.6"],
    formulaLabel: "Pythagorean identity",
    formula: "\\sin^2\\theta + \\cos^2\\theta = 1",
    solution: [
      "Use $\\sin^2\\theta + \\cos^2\\theta = 1$: $\\cos^2\\theta = 1 - \\tfrac{16}{25} = \\tfrac{9}{25}$.",
      "Since $\\theta$ is acute, $\\cos\\theta > 0$.",
      "$\\cos\\theta = \\tfrac{3}{5}$.",
    ],
  },
  {
    id: "TRI-008",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Express $\\dfrac{\\sin\\theta}{\\cos\\theta}$ in its simplest form.",
    acceptedAnswers: ["tan(theta)", "tantheta", "tanθ", "tan θ"],
    formulaLabel: "Quotient identity",
    formula: "\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}",
    solution: [
      "By definition, $\\dfrac{\\sin\\theta}{\\cos\\theta} = \\tan\\theta$.",
      "Final answer: $\\tan\\theta$.",
    ],
  },
  {
    id: "TRI-009",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Solve $\\sin x = \\dfrac{1}{2}$ for $0° \\le x \\le 180°$. Give both values, separated by a comma.",
    acceptedAnswers: ["30,150", "x=30,x=150"],
    unorderedSet: true,
    solution: [
      "Principal solution: $x = 30°$.",
      "In the second quadrant: $x = 180° - 30° = 150°$.",
      "Final answer: $x = 30°$ or $x = 150°$.",
    ],
  },
  {
    id: "TRI-010",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Moderate",
    question:
      "Solve $\\cos x = -\\dfrac{1}{2}$ for $0° \\le x \\le 360°$. Give both values, separated by a comma.",
    acceptedAnswers: ["120,240", "x=120,x=240"],
    unorderedSet: true,
    solution: [
      "$\\cos x$ is negative in the second and third quadrants.",
      "Reference angle is $60°$, so $x = 180° - 60° = 120°$ and $x = 180° + 60° = 240°$.",
      "Final answer: $x = 120°$ or $x = 240°$.",
    ],
  },
  {
    id: "TRI-011",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Moderate",
    question: "Evaluate $\\tan 60°$ as an exact value.",
    acceptedAnswers: ["sqrt(3)", "√3"],
    solution: [
      "$\\tan 60° = \\dfrac{\\sin 60°}{\\cos 60°} = \\dfrac{\\sqrt{3}/2}{1/2} = \\sqrt{3}$.",
      "Final answer: $\\sqrt{3}$.",
    ],
  },
  {
    id: "TRI-012",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Solve $2\\sin x = 1$ for $0° \\le x \\le 360°$. Give both values, separated by a comma.",
    acceptedAnswers: ["30,150", "x=30,x=150"],
    unorderedSet: true,
    solution: [
      "Divide both sides by 2: $\\sin x = \\tfrac{1}{2}$.",
      "Principal solution: $x = 30°$. Second-quadrant: $x = 150°$.",
      "Final answer: $x = 30°$ or $x = 150°$.",
    ],
  },
  {
    id: "TRI-013",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Solve $\\tan x = -1$ for $0° \\le x \\le 360°$. Give both values, separated by a comma.",
    acceptedAnswers: ["135,315", "x=135,x=315"],
    unorderedSet: true,
    solution: [
      "$\\tan x$ is negative in the second and fourth quadrants.",
      "Reference angle is $45°$, so $x = 180° - 45° = 135°$ and $x = 360° - 45° = 315°$.",
      "Final answer: $x = 135°$ or $x = 315°$.",
    ],
  },
  {
    id: "TRI-014",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "If $\\cos\\theta = -\\dfrac{5}{13}$ and $\\theta$ lies in the second quadrant, find $\\sin\\theta$.",
    acceptedAnswers: ["12/13"],
    formulaLabel: "Pythagorean identity",
    formula: "\\sin^2\\theta + \\cos^2\\theta = 1",
    solution: [
      "Use $\\sin^2\\theta + \\cos^2\\theta = 1$: $\\sin^2\\theta = 1 - \\tfrac{25}{169} = \\tfrac{144}{169}$.",
      "In the second quadrant, $\\sin\\theta > 0$.",
      "$\\sin\\theta = \\tfrac{12}{13}$.",
    ],
  },
  {
    id: "TRI-015",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Solve $2\\cos^2 x - 1 = 0$ for $0° \\le x \\le 180°$. Give both values, separated by a comma.",
    acceptedAnswers: ["45,135", "x=45,x=135"],
    unorderedSet: true,
    solution: [
      "Rearrange: $\\cos^2 x = \\tfrac{1}{2}$, so $\\cos x = \\pm \\tfrac{1}{\\sqrt{2}}$.",
      "$\\cos x = \\tfrac{1}{\\sqrt{2}} \\Rightarrow x = 45°$.",
      "$\\cos x = -\\tfrac{1}{\\sqrt{2}} \\Rightarrow x = 135°$.",
      "Final answer: $x = 45°$ or $x = 135°$.",
    ],
  },
  {
    id: "TRI-016",
    topic: "Trigonometry",
    section: "trigonometry",
    questionType: "short-text",
    difficulty: "Exam Style",
    question:
      "Simplify $\\dfrac{1 - \\cos^2\\theta}{\\sin\\theta}$.",
    acceptedAnswers: ["sin(theta)", "sintheta", "sinθ", "sin θ"],
    formulaLabel: "Pythagorean identity",
    formula: "\\sin^2\\theta + \\cos^2\\theta = 1",
    solution: [
      "Use $1 - \\cos^2\\theta = \\sin^2\\theta$.",
      "$\\dfrac{\\sin^2\\theta}{\\sin\\theta} = \\sin\\theta$.",
      "Final answer: $\\sin\\theta$.",
    ],
  },

  /* ---------- MCQ PRACTICE (11) ---------- */
  {
    id: "MCQ-ALG-001",
    topic: "Algebra",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "ALG-BASIC-G1",
    question: "Expand $(2x + 3)(x - 4)$.",
    options: {
      A: "$2x^2 - 8x + 3x - 12$",
      B: "$2x^2 - 5x - 12$",
      C: "$2x^2 - 11x - 12$",
      D: "$2x^2 + x - 12$",
    },
    correctAnswer: "B",
    acceptedAnswers: ["B"],
    solution: ["Expand: $2x^2 - 8x + 3x - 12 = 2x^2 - 5x - 12$."],
  },
  {
    id: "MCQ-ALG-002",
    topic: "Algebra",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "ALG-BASIC-G1",
    question: "Simplify $(3x^2y)(2xy^2)$.",
    options: {
      A: "$6x^3y^3$",
      B: "$5x^3y^3$",
      C: "$6x^2y^3$",
      D: "$6x^3y^2$",
    },
    correctAnswer: "A",
    acceptedAnswers: ["A"],
    solution: [
      "Multiply coefficients: $3 \\times 2 = 6$.",
      "Add powers: $x^2 \\times x = x^3$, $y \\times y^2 = y^3$.",
      "Final answer: $6x^3y^3$.",
    ],
  },
  {
    id: "MCQ-QUAD-001",
    topic: "Quadratics",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "QUAD-BASIC-G1",
    question: "Solve $x^2 - 2x - 3 = 0$.",
    options: {
      A: "$x = 3$ or $x = -1$",
      B: "$x = -3$ or $x = 1$",
      C: "$x = 3$ or $x = 1$",
      D: "$x = -3$ or $x = -1$",
    },
    correctAnswer: "A",
    acceptedAnswers: ["A"],
    solution: ["Factorise: $(x - 3)(x + 1) = 0$.", "So $x = 3$ or $x = -1$."],
  },
  {
    id: "MCQ-QUAD-002",
    topic: "Quadratics",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "QUAD-BASIC-G1",
    question: "Solve $3x^2 - 5x - 2 = 0$.",
    options: {
      A: "$x = 2$ or $x = -\\tfrac{1}{3}$",
      B: "$x = -2$ or $x = \\tfrac{1}{3}$",
      C: "$x = 2$ or $x = \\tfrac{1}{3}$",
      D: "$x = -2$ or $x = -\\tfrac{1}{3}$",
    },
    correctAnswer: "A",
    acceptedAnswers: ["A"],
    solution: ["Factorise: $(3x + 1)(x - 2) = 0$.", "So $x = 2$ or $x = -\\tfrac{1}{3}$."],
  },
  {
    id: "MCQ-DIFF-001",
    topic: "Differentiation",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "DIFF-BASIC-G1",
    question: "Differentiate $6x^3 - 4x^2 + x$.",
    options: {
      A: "$18x^2 - 8x + 1$",
      B: "$6x^2 - 8x + 1$",
      C: "$18x^2 - 4x + 1$",
      D: "$18x^2 - 8x$",
    },
    correctAnswer: "A",
    acceptedAnswers: ["A"],
    solution: [
      "Differentiate term by term.",
      "$\\dfrac{d}{dx}(6x^3) = 18x^2$, $\\dfrac{d}{dx}(-4x^2) = -8x$, $\\dfrac{d}{dx}(x) = 1$.",
      "Final answer: $18x^2 - 8x + 1$.",
    ],
  },
  {
    id: "MCQ-DIFF-002",
    topic: "Differentiation",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "DIFF-BASIC-G1",
    question: "Find the gradient of $y = x^2 + 3x$ at $x = 2$.",
    options: {
      A: "$5$",
      B: "$6$",
      C: "$7$",
      D: "$8$",
    },
    correctAnswer: "C",
    acceptedAnswers: ["C"],
    solution: [
      "$\\dfrac{dy}{dx} = 2x + 3$.",
      "At $x = 2$: $2(2) + 3 = 7$.",
    ],
  },
  {
    id: "MCQ-TRIG-001",
    topic: "Trigonometry",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "TRIG-BASIC-G1",
    question: "Solve $\\sin x = 0.5$ for $0° \\leq x \\leq 360°$.",
    options: {
      A: "$30°, 150°$",
      B: "$30°, 210°$",
      C: "$150°, 330°$",
      D: "$60°, 120°$",
    },
    correctAnswer: "A",
    acceptedAnswers: ["A"],
    solution: [
      "$\\sin^{-1}(0.5) = 30°$.",
      "Second solution in range: $180° - 30° = 150°$.",
      "Answers: $30°, 150°$.",
    ],
  },
  {
    id: "MCQ-TRIG-002",
    topic: "Trigonometry",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "TRIG-BASIC-G1",
    question: "Solve $\\cos x = 0.5$ for $0° \\leq x \\leq 360°$.",
    options: {
      A: "$60°, 120°$",
      B: "$60°, 300°$",
      C: "$120°, 300°$",
      D: "$30°, 330°$",
    },
    correctAnswer: "B",
    acceptedAnswers: ["B"],
    solution: [
      "$\\cos^{-1}(0.5) = 60°$.",
      "Second solution in range: $360° - 60° = 300°$.",
      "Answers: $60°, 300°$.",
    ],
  },
  {
    id: "MCQ-TRIG-003",
    topic: "Trigonometry",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    level: "Basic",
    variantGroup: "TRIG-BASIC-G1",
    question: "Solve $\\tan x = 1$ for $0° \\leq x \\leq 360°$.",
    options: {
      A: "$45°, 225°$",
      B: "$45°, 180°$",
      C: "$90°, 270°$",
      D: "$30°, 210°$",
    },
    correctAnswer: "A",
    acceptedAnswers: ["A"],
    solution: [
      "$\\tan^{-1}(1) = 45°$.",
      "Tan repeats every $180°$: second solution $45° + 180° = 225°$.",
      "Answers: $45°, 225°$.",
    ],
  },
  {
    id: "MCQ-MIX-001",
    topic: "Mixed",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    question: "Solve $x^2 + x - 12 = 0$.",
    options: {
      A: "$x = 3$ or $x = -4$",
      B: "$x = -3$ or $x = 4$",
      C: "$x = 6$ or $x = -2$",
      D: "$x = -6$ or $x = 2$",
    },
    correctAnswer: "A",
    acceptedAnswers: ["A"],
    solution: ["Factorise: $(x + 4)(x - 3) = 0$.", "So $x = 3$ or $x = -4$."],
  },
  {
    id: "MCQ-MIX-002",
    topic: "Mixed",
    section: "mcq",
    questionType: "multiple-choice",
    difficulty: "Moderate",
    question: "Differentiate $5x^2 - 3x + 7$.",
    options: {
      A: "$10x - 3$",
      B: "$5x - 3$",
      C: "$10x + 3$",
      D: "$5x + 3$",
    },
    correctAnswer: "A",
    acceptedAnswers: ["A"],
    solution: [
      "Differentiate term by term.",
      "$\\dfrac{d}{dx}(5x^2) = 10x$, $\\dfrac{d}{dx}(-3x) = -3$, $\\dfrac{d}{dx}(7) = 0$.",
      "Final answer: $10x - 3$.",
    ],
  },
];

/* Helpers */

export function questionsForSection(sectionId: SectionId): Question[] {
  if (sectionId === "mcq") {
    return QUESTIONS.filter((q) => q.section === "mcq");
  }
  if (sectionId === "mixed") {
    return shuffle(QUESTIONS.filter((q) => !q.variantGroup));
  }
  if (sectionId === "mistakes") {
    return [];
  }
  return QUESTIONS.filter((q) => q.section === sectionId);
}

export function questionsByIds(ids: string[]): Question[] {
  const map = new Map(QUESTIONS.map((q) => [q.id, q]));
  const out: Question[] = [];
  for (const id of ids) {
    const q = map.get(id);
    if (q) out.push(q);
  }
  return out;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Return all questions belonging to a specific variant group, in id order. */
export function questionsForVariantGroup(groupId: string): Question[] {
  return QUESTIONS.filter((q) => q.variantGroup === groupId);
}

/** Return the TopicId that a Question's topic maps to, or null for Mixed. */
export function topicIdForQuestion(q: Question): TopicId | null {
  const mapping: Record<Topic, TopicId | null> = {
    Algebra: "algebra",
    Surds: "surds",
    Quadratics: "quadratics",
    Differentiation: "differentiation",
    Integration: "integration",
    Trigonometry: "trigonometry",
    Mixed: null,
  };
  return mapping[q.topic] ?? null;
}

/**
 * Return an ordered list of unique variantGroup ids for the given
 * TopicId + Level combination. Order follows first appearance in QUESTIONS.
 */
export function variantGroupsForTopicLevel(topicId: TopicId, level: Level): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const q of QUESTIONS) {
    if (q.variantGroup && q.level === level && topicIdForQuestion(q) === topicId) {
      if (!seen.has(q.variantGroup)) {
        seen.add(q.variantGroup);
        result.push(q.variantGroup);
      }
    }
  }
  return result;
}

/** Counts how many variant groups exist for each level of a topic. */
export function groupCountsForTopic(topicId: TopicId): Record<Level, number> {
  return {
    Basic: variantGroupsForTopicLevel(topicId, "Basic").length,
    Intermediate: variantGroupsForTopicLevel(topicId, "Intermediate").length,
    Advanced: variantGroupsForTopicLevel(topicId, "Advanced").length,
  };
}
