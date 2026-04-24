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
  // matches below).
  s = s.replace(/\bpi\b/g, "\\pi ");
  s = s.replace(/\btheta\b/g, "\\theta ");
  s = s.replace(/π/g, "\\pi ");
  s = s.replace(/θ/g, "\\theta ");
  // Normalise the unicode √ symbol to the keyword `sqrt` so the balanced-call
  // wrapper below handles `√(x+1)` the same as `sqrt(x+1)` and braces the
  // argument as `\sqrt{x+1}`.
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

  // Powers: turn `^X` into `^{X}` where X is a single digit, +/- digit run,
  // a single letter, or a parenthesised group. Already-braced powers (`^{...}`)
  // are left alone.
  s = bracePowers(s);

  return s;
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
