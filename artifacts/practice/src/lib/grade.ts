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

// ---------------------------------------------------------------------------
// Symbolic equivalence layer.
//
// We parse normalised strings into a polynomial-with-rational-coefficients
// representation, then format that representation in a fixed canonical order.
// Two answers are then equivalent if they share a canonical string.
//
// This deliberately handles a *small* slice of algebra — the slice that shows
// up in IGCSE-level work — and bails out (returns null) on anything outside
// it. The original string-equality path still grades those questions.
//
// Examples that newly grade as equivalent thanks to this layer:
//   • Rational numbers in any form: "0.5" === "1/2" === "2/4"
//   • Re-ordered polynomial terms: "x+3" === "3+x"
//   • Expanded products vs. sums:  "x^2+2x-8" === "(x+4)(x-2)" === "-8+2x+x^2"
//   • Distributed constants:       "2(3x-1)" === "6x-2"
//   • Algebraic fraction merges:   "(x-3)/2 + 5/2" === "x/2 + 1" === "(x+2)/2"
//   • Any-order monomials:         "3xy + x^2" === "x^2 + 3yx"
//
// Things the layer intentionally does *not* attempt (and falls back on string
// equality for):
//   • Trig / surds / logs / π — anything containing pi, sqrt, sin, cos, tan,
//     log, ln or theta.
//   • Division by a non-constant (rational expressions like 1/(x+1)).
//   • Negative or non-integer exponents.
// ---------------------------------------------------------------------------

type Rational = { n: bigint; d: bigint };

function bigAbs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

function rGcd(a: bigint, b: bigint): bigint {
  let x = bigAbs(a);
  let y = bigAbs(b);
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

function rMake(n: bigint, d: bigint): Rational {
  if (d === 0n) throw new Error("rational: division by zero");
  let nn = n;
  let dd = d;
  if (dd < 0n) {
    nn = -nn;
    dd = -dd;
  }
  const g = rGcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

function rFromInt(n: bigint): Rational {
  return { n, d: 1n };
}

function rNeg(a: Rational): Rational {
  return { n: -a.n, d: a.d };
}

function rAdd(a: Rational, b: Rational): Rational {
  return rMake(a.n * b.d + b.n * a.d, a.d * b.d);
}

function rMul(a: Rational, b: Rational): Rational {
  return rMake(a.n * b.n, a.d * b.d);
}

function rIsZero(a: Rational): boolean {
  return a.n === 0n;
}

function rString(r: Rational): string {
  return r.d === 1n ? r.n.toString() : `${r.n}/${r.d}`;
}

/** Parse a non-negative numeric literal (the leading sign is handled by the parser). */
function parseNumberLiteral(s: string): Rational | null {
  if (!/^\d*\.?\d+$|^\d+\.?\d*$/.test(s)) return null;
  const m = s.match(/^(\d+)?(?:\.(\d+))?$/);
  if (!m || (!m[1] && !m[2])) return null;
  const intPart = BigInt(m[1] ?? "0");
  const fracStr = m[2] ?? "";
  if (fracStr.length === 0) return rMake(intPart, 1n);
  const denom = 10n ** BigInt(fracStr.length);
  const fracN = BigInt(fracStr);
  return rMake(intPart * denom + fracN, denom);
}

// A monomial key encodes the variable powers (e.g. {x:2, y:1} → "x^2*y^1").
// The empty string is the "constant" monomial. Variable names appear in
// alphabetical order so that "xy" and "yx" produce the same key.
type Poly = Map<string, Rational>;

function monomialKey(vars: Map<string, number>): string {
  const entries = [...vars.entries()].filter(([, e]) => e !== 0);
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return entries.map(([v, e]) => `${v}^${e}`).join("*");
}

function parseMonomialKey(k: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!k) return out;
  for (const part of k.split("*")) {
    const [v, eStr] = part.split("^");
    out.set(v, parseInt(eStr, 10));
  }
  return out;
}

function monomialDegree(k: string): number {
  if (!k) return 0;
  let total = 0;
  for (const part of k.split("*")) {
    total += parseInt(part.split("^")[1], 10);
  }
  return total;
}

function polyZero(): Poly {
  return new Map();
}

function polyConst(r: Rational): Poly {
  if (rIsZero(r)) return polyZero();
  return new Map([["", r]]);
}

function polyVar(name: string): Poly {
  return new Map([[`${name}^1`, rFromInt(1n)]]);
}

function polySet(p: Poly, k: string, v: Rational): void {
  if (rIsZero(v)) p.delete(k);
  else p.set(k, v);
}

function polyAdd(a: Poly, b: Poly): Poly {
  const out: Poly = new Map(a);
  for (const [k, v] of b) {
    const cur = out.get(k);
    polySet(out, k, cur ? rAdd(cur, v) : v);
  }
  return out;
}

function polyNeg(a: Poly): Poly {
  const out: Poly = new Map();
  for (const [k, v] of a) out.set(k, rNeg(v));
  return out;
}

function polyMul(a: Poly, b: Poly): Poly {
  const out: Poly = new Map();
  for (const [ak, av] of a) {
    const aVars = parseMonomialKey(ak);
    for (const [bk, bv] of b) {
      const bVars = parseMonomialKey(bk);
      const merged = new Map(aVars);
      for (const [v, e] of bVars) {
        merged.set(v, (merged.get(v) ?? 0) + e);
      }
      const k = monomialKey(merged);
      const c = rMul(av, bv);
      const cur = out.get(k);
      polySet(out, k, cur ? rAdd(cur, c) : c);
    }
  }
  return out;
}

/** If `p` is a (rational) constant, return that rational; otherwise null. */
function polyToConst(p: Poly): Rational | null {
  if (p.size === 0) return rFromInt(0n);
  if (p.size === 1) {
    const onlyKey = [...p.keys()][0];
    if (onlyKey === "") return p.get("")!;
  }
  return null;
}

/** Polynomial power for non-negative integer exponents only. */
function polyPow(a: Poly, n: number): Poly | null {
  if (!Number.isInteger(n) || n < 0) return null;
  let out = polyConst(rFromInt(1n));
  for (let i = 0; i < n; i++) out = polyMul(out, a);
  return out;
}

/** Division is only supported when the divisor reduces to a non-zero constant. */
function polyDiv(a: Poly, b: Poly): Poly | null {
  const c = polyToConst(b);
  if (c === null || rIsZero(c)) return null;
  const inv = rMake(c.d, c.n); // 1/c
  const out: Poly = new Map();
  for (const [k, v] of a) out.set(k, rMul(v, inv));
  return out;
}

// ----- Tokeniser & parser --------------------------------------------------

type Tok =
  | { t: "num"; v: Rational }
  | { t: "var"; v: string }
  | { t: "op"; v: "+" | "-" | "/" | "^" }
  | { t: "lp" }
  | { t: "rp" };

// Anything matching one of these substrings (post-normalisation) means we are
// outside the polynomial fragment we model — bail out and let string equality
// take over.
const FORBIDDEN_TOKENS = ["pi", "sqrt", "sin", "cos", "tan", "log", "ln", "theta"];

function isPolynomialCandidate(s: string): boolean {
  if (!s) return false;
  for (const t of FORBIDDEN_TOKENS) if (s.includes(t)) return false;
  // Only digits, lowercase letters, and the operators we model.
  return /^[\da-z+\-/^().]+$/.test(s);
}

function tokenize(s: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "+" || c === "-" || c === "/" || c === "^") {
      out.push({ t: "op", v: c });
      i++;
    } else if (c === "(") {
      out.push({ t: "lp" });
      i++;
    } else if (c === ")") {
      out.push({ t: "rp" });
      i++;
    } else if (c >= "0" && c <= "9") {
      let j = i;
      while (j < s.length && ((s[j] >= "0" && s[j] <= "9") || s[j] === ".")) j++;
      const r = parseNumberLiteral(s.slice(i, j));
      if (!r) return null;
      out.push({ t: "num", v: r });
      i = j;
    } else if (c === ".") {
      let j = i;
      while (j < s.length && ((s[j] >= "0" && s[j] <= "9") || s[j] === ".")) j++;
      const r = parseNumberLiteral(s.slice(i, j));
      if (!r) return null;
      out.push({ t: "num", v: r });
      i = j;
    } else if (c >= "a" && c <= "z") {
      // Each letter is its own variable. "xy" tokenises as x and y, with
      // implicit multiplication. (FORBIDDEN_TOKENS already screened out the
      // function-name letter sequences we don't want to split.)
      out.push({ t: "var", v: c });
      i++;
    } else {
      return null;
    }
  }
  return out;
}

class Parser {
  private i = 0;
  constructor(private readonly toks: Tok[]) {}

  private peek(): Tok | undefined {
    return this.toks[this.i];
  }

  private consume(): Tok {
    return this.toks[this.i++];
  }

  done(): boolean {
    return this.i === this.toks.length;
  }

  parseExpr(): Poly | null {
    let left = this.parseTerm();
    if (!left) return null;
    while (true) {
      const p = this.peek();
      if (!p || p.t !== "op" || (p.v !== "+" && p.v !== "-")) break;
      this.consume();
      const right = this.parseTerm();
      if (!right) return null;
      left = p.v === "+" ? polyAdd(left, right) : polyAdd(left, polyNeg(right));
    }
    return left;
  }

  private parseTerm(): Poly | null {
    let left = this.parseUnary();
    if (!left) return null;
    while (true) {
      const p = this.peek();
      if (!p) break;
      let mode: "div" | "mul" | null = null;
      if (p.t === "op" && p.v === "/") {
        mode = "div";
        this.consume();
      } else if (p.t === "num" || p.t === "var" || p.t === "lp") {
        mode = "mul"; // implicit multiplication
      } else {
        break;
      }
      const right = this.parseUnary();
      if (!right) return null;
      if (mode === "div") {
        const d = polyDiv(left, right);
        if (!d) return null;
        left = d;
      } else {
        left = polyMul(left, right);
      }
    }
    return left;
  }

  private parseUnary(): Poly | null {
    const p = this.peek();
    if (p && p.t === "op" && p.v === "-") {
      this.consume();
      const u = this.parseUnary();
      return u ? polyNeg(u) : null;
    }
    if (p && p.t === "op" && p.v === "+") {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): Poly | null {
    const a = this.parseAtom();
    if (!a) return null;
    const p = this.peek();
    if (p && p.t === "op" && p.v === "^") {
      this.consume();
      const exp = this.parseUnary();
      if (!exp) return null;
      const c = polyToConst(exp);
      if (c === null || c.d !== 1n) return null;
      const n = Number(c.n);
      if (!Number.isSafeInteger(n)) return null;
      return polyPow(a, n);
    }
    return a;
  }

  private parseAtom(): Poly | null {
    const p = this.peek();
    if (!p) return null;
    if (p.t === "num") {
      this.consume();
      return polyConst(p.v);
    }
    if (p.t === "var") {
      this.consume();
      return polyVar(p.v);
    }
    if (p.t === "lp") {
      this.consume();
      const e = this.parseExpr();
      if (!e) return null;
      const close = this.peek();
      if (!close || close.t !== "rp") return null;
      this.consume();
      return e;
    }
    return null;
  }
}

function polyCanonical(p: Poly): string {
  if (p.size === 0) return "0";
  const entries = [...p.entries()];
  entries.sort((a, b) => {
    const da = monomialDegree(a[0]);
    const db = monomialDegree(b[0]);
    if (da !== db) return db - da;
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  return entries.map(([k, v]) => `${rString(v)}*${k || "1"}`).join("+");
}

/**
 * Turn an already-normalised string into a canonical polynomial string, or
 * return null if the input is outside the supported polynomial fragment.
 */
export function canonicalise(normalised: string): string | null {
  if (!isPolynomialCandidate(normalised)) return null;
  const toks = tokenize(normalised);
  if (!toks || toks.length === 0) return null;
  const parser = new Parser(toks);
  let result: Poly | null;
  try {
    result = parser.parseExpr();
  } catch {
    return null;
  }
  if (!result || !parser.done()) return null;
  return polyCanonical(result);
}

function canonicaliseOrSelf(normalised: string): string {
  return canonicalise(normalised) ?? normalised;
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

  // 2) Symbolic equivalence (polynomial / rational canonical form).
  const learnerCanon = canonicalise(learner);
  if (learnerCanon !== null) {
    for (const accepted of question.acceptedAnswers) {
      const accCanon = canonicalise(normalise(accepted));
      if (accCanon !== null && accCanon === learnerCanon) {
        return { correct: true };
      }
    }
  }

  // 3) For unordered sets (e.g. quadratic roots), compare comma-separated parts.
  if (question.unorderedSet) {
    const learnerParts = splitParts(raw).map(canonicaliseOrSelf);
    if (learnerParts.length > 1) {
      for (const accepted of question.acceptedAnswers) {
        const acceptedParts = splitParts(accepted).map(canonicaliseOrSelf);
        if (acceptedParts.length > 1 && partsEqualUnordered(acceptedParts, learnerParts)) {
          return { correct: true };
        }
      }
    }
  }

  return { correct: false };
}
