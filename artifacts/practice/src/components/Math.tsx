import katex from "katex";
import { useMemo } from "react";

interface MathTextProps {
  children: string;
  className?: string;
  block?: boolean;
}

/**
 * Render a string containing inline KaTeX with $...$ delimiters and
 * display KaTeX with $$...$$ delimiters. Pass `block` to render the entire
 * string as one display equation.
 */
export function MathText({ children, className, block = false }: MathTextProps) {
  const html = useMemo(() => renderMixed(children, block), [children, block]);
  const Tag = block ? "div" : "span";
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      data-testid="text-math"
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tryRender(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "html",
    });
  } catch {
    return escapeHtml(tex);
  }
}

function renderMixed(input: string, blockEntirely: boolean): string {
  if (blockEntirely) {
    return tryRender(input, true);
  }
  // Tokenise on $$...$$ first, then $...$.
  let html = "";
  let i = 0;
  while (i < input.length) {
    if (input[i] === "$" && input[i + 1] === "$") {
      const end = input.indexOf("$$", i + 2);
      if (end === -1) {
        html += escapeHtml(input.slice(i));
        break;
      }
      const tex = input.slice(i + 2, end);
      html += tryRender(tex, true);
      i = end + 2;
    } else if (input[i] === "$") {
      const end = input.indexOf("$", i + 1);
      if (end === -1) {
        html += escapeHtml(input.slice(i));
        break;
      }
      const tex = input.slice(i + 1, end);
      html += tryRender(tex, false);
      i = end + 1;
    } else {
      const next = input.indexOf("$", i);
      if (next === -1) {
        html += escapeHtml(input.slice(i));
        break;
      }
      html += escapeHtml(input.slice(i, next));
      i = next;
    }
  }
  return html;
}
