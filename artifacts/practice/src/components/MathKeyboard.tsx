import type { RefObject } from "react";

/**
 * One-tap symbol palette for the answer input. Each button inserts plain
 * ASCII text at the current cursor position so the grader receives the
 * exact same strings it always has — no schema or grader changes required.
 *
 * Buttons use `onMouseDown` with `preventDefault` so they never steal focus
 * from the input (otherwise the caret would jump to the end on every press
 * and mobile keyboards would close).
 */

interface MathKey {
  /**
   * Stable identifier used for the `data-testid`. Required because many
   * keys use symbol-only labels (`+`, `−`, `π`, `▢^▢`) that all slug to
   * the same string and would otherwise collide in the DOM.
   */
  id: string;
  /** Visible button label. */
  label: string;
  /** Plain text to insert at the cursor. */
  insert: string;
  /**
   * Where to put the caret after insertion, measured from the start of the
   * inserted text. Defaults to the end of the inserted text. Use this for
   * function calls so the caret lands inside the parentheses, e.g. for
   * `sqrt()` set caret to 5.
   */
  caret?: number;
  /** Tooltip / aria-label for accessibility. */
  title?: string;
  /** Visual emphasis class for action keys (backspace, clear). */
  variant?: "default" | "muted" | "danger";
}

const ROWS: MathKey[][] = [
  // Row 0 — digits. Lets students type indices, coefficients and constants
  // without flipping back to the system numeric keyboard mid-answer.
  [
    { id: "1", label: "1", insert: "1" },
    { id: "2", label: "2", insert: "2" },
    { id: "3", label: "3", insert: "3" },
    { id: "4", label: "4", insert: "4" },
    { id: "5", label: "5", insert: "5" },
    { id: "6", label: "6", insert: "6" },
    { id: "7", label: "7", insert: "7" },
    { id: "8", label: "8", insert: "8" },
    { id: "9", label: "9", insert: "9" },
    { id: "0", label: "0", insert: "0" },
  ],
  // Row 1 — basic operators and grouping.
  [
    { id: "plus", label: "+", insert: "+", title: "Plus" },
    { id: "minus", label: "−", insert: "-", title: "Minus" },
    { id: "equals", label: "=", insert: "=" },
    { id: "parens", label: "(\u2009)", insert: "()", caret: 1, title: "Parentheses" },
    { id: "divide", label: "/", insert: "/", title: "Divide" },
    {
      id: "fraction",
      label: "▢⁄▢",
      insert: "()/()",
      caret: 1,
      title:
        "Fraction template — type the numerator, then the denominator inside the second pair of brackets",
    },
    { id: "comma", label: ",", insert: ",", title: "Separate multiple answers" },
    { id: "plus-minus", label: "±", insert: "±", title: "Plus or minus" },
  ],
  // Row 2 — variables, powers, root.
  [
    { id: "x", label: "x", insert: "x" },
    { id: "y", label: "y", insert: "y" },
    { id: "x-squared", label: "x²", insert: "x^2", title: "x squared" },
    { id: "x-cubed", label: "x³", insert: "x^3", title: "x cubed" },
    { id: "x-power", label: "x^", insert: "x^", title: "x to a power" },
    {
      id: "power-template",
      label: "▢^▢",
      insert: "()^()",
      caret: 1,
      title:
        "Power template — type the base in the first brackets, then the index in the second",
    },
    // Inserting the unicode characters (rather than the words "sqrt", "pi",
    // "theta") gives the parser a clean boundary even when these keys are
    // tapped right after a digit or letter. e.g. mashing 8 + θ + √( + 2 + )
    // becomes `8θ√(2)` which the parser handles unambiguously, whereas
    // `8thetasqrt(2)` looked like one long identifier and rendered as junk.
    // The grader normalises π/θ/√ back to pi/theta/sqrt so accepted-answer
    // matching is unchanged.
    { id: "sqrt", label: "√(\u2009)", insert: "√()", caret: 2, title: "Square root" },
    { id: "pi", label: "π", insert: "π", title: "Pi" },
    { id: "theta", label: "θ", insert: "θ", title: "Theta" },
  ],
  // Row 3 — trig functions and edit actions.
  [
    { id: "sin", label: "sin", insert: "sin()", caret: 4, title: "Sine" },
    { id: "cos", label: "cos", insert: "cos()", caret: 4, title: "Cosine" },
    { id: "tan", label: "tan", insert: "tan()", caret: 4, title: "Tangent" },
    {
      id: "backspace",
      label: "⌫",
      insert: "",
      title: "Backspace",
      variant: "muted",
    },
    {
      id: "clear",
      label: "Clear",
      insert: "",
      title: "Clear the answer",
      variant: "danger",
    },
  ],
];

interface MathKeyboardProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
}

export function MathKeyboard({ inputRef, value, onChange }: MathKeyboardProps) {
  const insertAtCursor = (text: string, caret?: number) => {
    const el = inputRef.current;
    if (!el) {
      onChange(value + text);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    const caretPos = start + (caret ?? text.length);
    onChange(next);
    // Restore focus + selection on the next tick so the controlled-input
    // re-render has settled.
    requestAnimationFrame(() => {
      const e = inputRef.current;
      if (!e) return;
      e.focus();
      try {
        e.setSelectionRange(caretPos, caretPos);
      } catch {
        // Some input types (e.g. type="number") throw — safe to ignore.
      }
    });
  };

  const handleBackspace = () => {
    const el = inputRef.current;
    if (!el) {
      onChange(value.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    if (start === end) {
      // No selection → delete the character before the caret.
      if (start === 0) return;
      const next = value.slice(0, start - 1) + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const e = inputRef.current;
        if (!e) return;
        e.focus();
        try {
          e.setSelectionRange(start - 1, start - 1);
        } catch {
          /* ignore */
        }
      });
    } else {
      // Selection → delete it.
      const next = value.slice(0, start) + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const e = inputRef.current;
        if (!e) return;
        e.focus();
        try {
          e.setSelectionRange(start, start);
        } catch {
          /* ignore */
        }
      });
    }
  };

  const handleClear = () => {
    onChange("");
    requestAnimationFrame(() => {
      const e = inputRef.current;
      if (!e) return;
      e.focus();
    });
  };

  const press = (key: MathKey) => {
    if (key.id === "backspace") {
      handleBackspace();
      return;
    }
    if (key.id === "clear") {
      handleClear();
      return;
    }
    insertAtCursor(key.insert, key.caret);
  };

  return (
    <div
      className="mt-3 rounded-lg border border-border bg-muted/40 p-2"
      data-testid="math-keyboard"
      aria-label="Math symbol keyboard"
    >
      <div className="flex flex-col gap-2">
        {ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex flex-wrap gap-1.5">
            {row.map((key) => (
              <button
                key={`${rIdx}-${key.id}`}
                type="button"
                title={key.title ?? key.label}
                aria-label={key.title ?? key.label}
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => press(key)}
                data-testid={`math-key-${key.id}`}
                className={[
                  "min-w-[2.5rem] flex-1 rounded-md border border-border px-2 py-2 font-mono text-sm font-semibold shadow-sm transition-colors sm:flex-none sm:min-w-[2.75rem] sm:text-base",
                  key.variant === "danger"
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : key.variant === "muted"
                    ? "bg-card text-muted-foreground hover:bg-muted"
                    : "bg-card text-foreground hover:bg-primary/10",
                ].join(" ")}
              >
                {key.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

