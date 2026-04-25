import katex from "katex";

/**
 * Convert the student's plain-text answer into a TeX string for live preview.
 *
 * This is a deliberately small set of "friendly" transforms — the same surface
 * the on-screen math keyboard exposes — so what the student sees rendered
 * matches what they typed:
 *
 *   sqrt(x+1)  -> \sqrt{x+1}
 *   x^2        -> x^{2}
 *   (x+1)^3    -> (x+1)^{3}
 *   pi, theta  -> \pi, \theta
 *   *          -> \cdot
 *   <= / >=    -> \le / \ge
 *   sin( ... ) / cos( ... ) / tan( ... )  -> \sin( ... ) / \cos( ... ) / \tan( ... )
 *
 * It does NOT try to be a full computer-algebra parser. The grader is the
 * source of truth — this is preview-only.
 */
export function textToTex(input: string): string {
  let s = input;

  // Greek letters first (so they don't collide with sqrt/sin/cos/tan word
  // matches below). The negative lookbehind prevents double-escaping when
  // textToTex recurses (e.g. on the inner of `\sqrt{a+pi}`) and we'd otherwise
  // turn `\pi` into `\\pi`.
  s = s.replace(/(?<!\\)\bpi\b/g, "\\pi ");
  s = s.replace(/(?<!\\)\btheta\b/g, "\\theta ");
  s = s.replace(/π/g, "\\pi ");
  s = s.replace(/θ/g, "\\theta ");
  // Normalise the unicode √ symbol. `√(x+1)` becomes `sqrt(x+1)` for the
  // balanced-call wrapper; bare forms like `√3` or `√x` are converted directly
  // so accepted answers stored as `√3/2` still render with a real radical.
  s = s.replace(/√\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z])/g, "\\sqrt{$1}");
  s = s.replace(/√/g, "sqrt");

  // Wrap balanced calls: sqrt(...), sin(...), cos(...), tan(...).
  s = wrapBalancedCall(s, "sqrt", "\\sqrt", true);
  s = wrapBalancedCall(s, "sin", "\\sin", false);
  s = wrapBalancedCall(s, "cos", "\\cos", false);
  s = wrapBalancedCall(s, "tan", "\\tan", false);

  // Comparators.
  s = s.replace(/<=/g, "\\le ");
  s = s.replace(/>=/g, "\\ge ");
  s = s.replace(/!=/g, "\\ne ");

  // Multiplication.
  s = s.replace(/\*/g, "\\cdot ");
  s = s.replace(/×/g, "\\cdot ");
  s = s.replace(/÷/g, "\\div ");
  s = s.replace(/±/g, "\\pm ");

  // Fractions: convert `a/b`, `(a)/b`, `a/(b)` and `(a)/(b)` into `\frac{a}{b}`
  // so the on-screen fraction key (which inserts `()/()`) and dataset answers
  // like `dy/dx` or `1/2` render as a proper stacked fraction. Run before
  // bracePowers so a denominator like `x^2` is recognised as the right operand.
  s = wrapFractions(s);

  // Powers: turn `^X` into `^{X}` where X is a single digit, +/- digit run,
  // a single letter, or a parenthesised group. Already-braced powers (`^{...}`)
  // are left alone.
  s = bracePowers(s);

  return s;
}

/**
 * Walk left-to-right. At each `/`, try to peel off a left operand from what
 * we've already emitted and a right operand from what's still ahead. If both
 * are recognisable as a single math atom or balanced group, replace with
 * `\frac{LEFT}{RIGHT}`. Otherwise leave the `/` in place.
 *
 * Operand shapes recognised:
 *   - Balanced parenthesised group `(...)` (parens stripped when used as the
 *     fraction body)
 *   - A `\name{...}` group (e.g. `\sqrt{3}`)
 *   - An identifier run `[a-zA-Z]+` (e.g. `dy`, `pi`)
 *   - A number `\d+(\.\d+)?` (e.g. `42`, `0.5`)
 *
 * Notes:
 *   - A leading sign on the numerator/denominator is intentionally NOT
 *     consumed, so `-1/x` becomes `-\frac{1}{x}` (which renders identically).
 *   - Already-formed `\frac{a}{b}` on the left is not re-consumed (we don't
 *     attempt to detect chained `a/b/c`); that's a rare shape in this dataset.
 */
function wrapFractions(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src[i] !== "/") {
      out += src[i];
      i++;
      continue;
    }
    const left = extractLeftOperand(out);
    const right = extractRightOperand(src, i + 1);
    if (left && right) {
      out =
        out.slice(0, out.length - left.matched.length) +
        `\\frac{${left.inner}}{${right.inner}}`;
      i = i + 1 + right.matched.length;
      continue;
    }
    out += "/";
    i++;
  }
  return out;
}

function extractRightOperand(
  s: string,
  start: number,
): { matched: string; inner: string } | null {
  if (start >= s.length) return null;
  const ch = s[start];
  if (ch === "(") {
    let depth = 1;
    let j = start + 1;
    while (j < s.length && depth > 0) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")") {
        depth--;
        if (depth === 0) break;
      }
      j++;
    }
    if (depth !== 0) return null;
    return {
      matched: s.slice(start, j + 1),
      inner: s.slice(start + 1, j),
    };
  }
  let core: string | null = null;
  if (ch === "\\") {
    // Match `\name`, optionally followed by a balanced `{...}` or `(...)` arg.
    // The simple regex below intentionally permits at most one nesting layer
    // for `(...)` — enough to cover our wrapped trig calls like `\sin(theta)`
    // and `\cos(theta)`.
    const cmd = s.slice(start).match(/^\\[a-zA-Z]+/);
    if (cmd) {
      let len = cmd[0].length;
      const after = s[start + len];
      if (after === "{") {
        let depth = 1;
        let j = start + len + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === "{") depth++;
          else if (s[j] === "}") {
            depth--;
            if (depth === 0) break;
          }
          j++;
        }
        if (depth === 0) len = j + 1 - start;
      } else if (after === "(") {
        let depth = 1;
        let j = start + len + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === "(") depth++;
          else if (s[j] === ")") {
            depth--;
            if (depth === 0) break;
          }
          j++;
        }
        if (depth === 0) len = j + 1 - start;
      }
      core = s.slice(start, start + len);
    }
  }
  if (core === null) {
    const numMatch = s.slice(start).match(/^[0-9]+(?:\.[0-9]+)?/);
    if (numMatch) core = numMatch[0];
  }
  if (core === null) {
    const idMatch = s.slice(start).match(/^[a-zA-Z]+/);
    if (idMatch) core = idMatch[0];
  }
  if (core === null) return null;
  // Greedily extend the right operand across a trailing power so `1/x^2`
  // becomes `\frac{1}{x^2}` instead of `\frac{1}{x}^{2}`. The exponent body
  // can be a parenthesised group, an already-braced group, an optional sign +
  // digit run, or a single letter — mirroring `bracePowers` above.
  let end = start + core.length;
  if (end < s.length && s[end] === "^") {
    end++;
    if (end < s.length) {
      const ec = s[end];
      if (ec === "{") {
        let depth = 1;
        let j = end + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === "{") depth++;
          else if (s[j] === "}") {
            depth--;
            if (depth === 0) break;
          }
          j++;
        }
        if (depth === 0) end = j + 1;
      } else if (ec === "(") {
        let depth = 1;
        let j = end + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === "(") depth++;
          else if (s[j] === ")") {
            depth--;
            if (depth === 0) break;
          }
          j++;
        }
        if (depth === 0) end = j + 1;
      } else {
        const expM = s.slice(end).match(/^([+-]?\d+|[a-zA-Z])/);
        if (expM) end += expM[0].length;
      }
    }
  }
  const matched = s.slice(start, end);
  return { matched, inner: matched };
}

function extractLeftOperand(
  out: string,
): { matched: string; inner: string } | null {
  if (out.length === 0) return null;
  const last = out[out.length - 1];

  // Helper: starting at `out.length`, scan backwards once for an atom and
  // return its starting index plus whether the matched form is a "(... )"
  // group whose parens should be stripped when used as a fraction body.
  const peelOnce = (
    end: number,
  ): { start: number; stripParens: boolean } | null => {
    if (end <= 0) return null;
    const ch = out[end - 1];
    if (ch === ")") {
      let depth = 1;
      let j = end - 2;
      while (j >= 0 && depth > 0) {
        if (out[j] === ")") depth++;
        else if (out[j] === "(") {
          depth--;
          if (depth === 0) break;
        }
        j--;
      }
      if (depth !== 0) return null;
      // If the `(` is immediately preceded by `\name`, that's a function call
      // (e.g. `\sin(theta)`) — extend leftward over the command name and
      // keep the parens (don't strip them, they're part of the call).
      let k = j - 1;
      while (k >= 0 && /[a-zA-Z]/.test(out[k])) k--;
      if (k >= 0 && out[k] === "\\") {
        return { start: k, stripParens: false };
      }
      return { start: j, stripParens: true };
    }
    if (ch === "}") {
      let depth = 1;
      let j = end - 2;
      while (j >= 0 && depth > 0) {
        if (out[j] === "}") depth++;
        else if (out[j] === "{") {
          depth--;
          if (depth === 0) break;
        }
        j--;
      }
      if (depth !== 0) return null;
      // `\name{...}` form (e.g. `\sqrt{3}`).
      let k = j - 1;
      while (k >= 0 && /[a-zA-Z]/.test(out[k])) k--;
      if (k >= 0 && out[k] === "\\") {
        return { start: k, stripParens: false };
      }
      return null;
    }
    if (/[0-9]/.test(ch)) {
      let j = end - 1;
      while (j > 0 && /[0-9.]/.test(out[j - 1])) j--;
      return { start: j, stripParens: false };
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = end - 1;
      while (j > 0 && /[a-zA-Z]/.test(out[j - 1])) j--;
      return { start: j, stripParens: false };
    }
    return null;
  };

  if (last !== ")" && last !== "}" && !/[0-9a-zA-Z]/.test(last)) {
    return null;
  }

  // Peel the trailing atom, then keep peeling backwards across any `^base`
  // anchors so `x^2/3` is treated as `(x^2) / 3` rather than `x^(2/3)`.
  let cursor = out.length;
  let firstStripParens = false;
  let firstAtom: { start: number; stripParens: boolean } | null = null;
  while (true) {
    const peeled = peelOnce(cursor);
    if (!peeled) break;
    if (firstAtom === null) {
      firstAtom = peeled;
      firstStripParens = peeled.stripParens;
    }
    cursor = peeled.start;
    if (cursor === 0 || out[cursor - 1] !== "^") break;
    // We saw `...^<atom>`. Step back over the `^` and try to peel the base.
    cursor -= 1;
    firstStripParens = false; // composite atom — never strip outer parens.
  }

  if (firstAtom === null) return null;
  const matched = out.slice(cursor);
  const inner =
    firstStripParens && cursor === firstAtom.start
      ? out.slice(firstAtom.start + 1, out.length - 1)
      : matched;
  return { matched, inner };
}

/**
 * Wrap `name(...)` calls with `\name{...}` (when `useBraces`) or
 * `\name(...)` (when not). Inner content is recursively transformed via
 * textToTex so nested calls preview correctly.
 */
function wrapBalancedCall(
  src: string,
  name: string,
  replacement: string,
  useBraces: boolean,
): string {
  let out = "";
  let i = 0;
  const word = name;
  while (i < src.length) {
    // Match name( with a word-boundary before name.
    const slice = src.slice(i, i + word.length);
    const prevChar = i === 0 ? "" : src[i - 1];
    const isWordBoundary = !/[a-zA-Z0-9_\\]/.test(prevChar);
    const nextChar = src[i + word.length];
    if (slice === word && isWordBoundary && nextChar === "(") {
      const start = i + word.length + 1;
      let depth = 1;
      let j = start;
      while (j < src.length && depth > 0) {
        const c = src[j];
        if (c === "(") depth++;
        else if (c === ")") {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      if (depth !== 0) {
        // Unbalanced — leave this occurrence alone, advance one char.
        out += src[i];
        i++;
        continue;
      }
      const inner = textToTex(src.slice(start, j));
      out += useBraces ? `${replacement}{${inner}}` : `${replacement}(${inner})`;
      i = j + 1;
    } else {
      out += src[i];
      i++;
    }
  }
  return out;
}

/**
 * Walk left-to-right and rewrite `^X` into `^{X}`. X is one of:
 *   - a parenthesised group `(...)` (balanced)
 *   - an optional sign followed by a digit run (e.g. `2`, `-3`, `+4`)
 *   - a single letter
 * Already-braced exponents (`^{...}`) are kept verbatim.
 */
function bracePowers(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src[i] !== "^") {
      out += src[i];
      i++;
      continue;
    }
    // ^ found.
    out += "^";
    i++;
    if (i >= src.length) continue;
    if (src[i] === "{") {
      // Already braced — copy through to matching }.
      let depth = 1;
      out += "{";
      i++;
      while (i < src.length && depth > 0) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") depth--;
        out += src[i];
        i++;
        if (depth === 0) break;
      }
      continue;
    }
    if (src[i] === "(") {
      // Parenthesised exponent → strip parens, brace it.
      let depth = 1;
      let j = i + 1;
      while (j < src.length && depth > 0) {
        if (src[j] === "(") depth++;
        else if (src[j] === ")") {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      if (depth !== 0) continue;
      const inner = src.slice(i + 1, j);
      out += `{${inner}}`;
      i = j + 1;
      continue;
    }
    // Sign + digits, or single letter.
    const m = src.slice(i).match(/^([+-]?\d+|[a-zA-Z])/);
    if (m) {
      out += `{${m[1]}}`;
      i += m[1].length;
      continue;
    }
  }
  return out;
}

/**
 * Try to render `input` as KaTeX after applying the friendly transforms.
 * Returns `{ kind: "tex", html }` on success or `{ kind: "text", value }`
 * when the parse fails so the caller can show plain monospaced text instead.
 */
export function previewKatex(
  input: string,
): { kind: "tex"; html: string } | { kind: "text"; value: string } {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "text", value: "" };
  const tex = textToTex(trimmed);
  try {
    const html = katex.renderToString(tex, {
      throwOnError: true,
      strict: "ignore",
      output: "html",
    });
    return { kind: "tex", html };
  } catch {
    return { kind: "text", value: trimmed };
  }
}
