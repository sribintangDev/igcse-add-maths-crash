import { describe, expect, it } from "vitest";
import { textToTex, previewKatex } from "./textToTex";

/**
 * These tests pin down the answer-preview transform, especially the cases
 * users have hit on mobile. Each block targets a specific class of bug we
 * have already shipped a fix for; if any of these regress the live preview
 * starts rendering literal junk again.
 */

describe("textToTex — fractions", () => {
  it.each([
    ["1/2", "\\frac{1}{2}"],
    ["(3)/(4)", "\\frac{3}{4}"],
    ["dy/dx=4x^3", "\\frac{dy}{dx}=4x^{3}"],
    ["(5x+2)/(x(x+1))", "\\frac{5x+2}{x(x+1)}"],
    ["sqrt(3)/2", "\\frac{\\sqrt{3}}{2}"],
    ["√3/2", "\\frac{\\sqrt{3}}{2}"],
    ["-1/x^2", "-\\frac{1}{x^{2}}"],
    // Right operand greedily consumes a trailing power so we don't get
    // \frac{1}{x}^{2}.
    ["1/x^2", "\\frac{1}{x^{2}}"],
    // Left operand walks across a `^base` anchor so x^2/3 means (x^2)/3,
    // not x^(2/3).
    ["x^2/3", "\\frac{x^{2}}{3}"],
    // Function-call atoms on both sides.
    ["sin(theta)/cos(theta)", "\\frac{\\sin(\\theta )}{\\cos(\\theta )}"],
  ])("%s -> %s", (input, expected) => {
    expect(textToTex(input)).toBe(expected);
  });

  it("leaves a spaced `1 / 2` alone (conservative — student likely meant division, not a fraction)", () => {
    expect(textToTex("1 / 2")).toBe("1 / 2");
  });
});

describe("textToTex — powers", () => {
  it.each([
    ["x^2", "x^{2}"],
    ["4x^3", "4x^{3}"],
    ["-x^-2", "-x^{-2}"],
    ["(1/2)x^(-1/2)", "(\\frac{1}{2})x^{-\\frac{1}{2}}"],
  ])("%s -> %s", (input, expected) => {
    expect(textToTex(input)).toBe(expected);
  });
});

describe("textToTex — greek letters", () => {
  it("converts standalone pi / theta", () => {
    expect(textToTex("pi")).toBe("\\pi ");
    expect(textToTex("theta")).toBe("\\theta ");
  });

  it("converts pi / theta even when preceded by a digit or letter (no left word boundary required)", () => {
    expect(textToTex("8pi")).toBe("8\\pi ");
    expect(textToTex("Api")).toBe("A\\pi ");
    expect(textToTex("2theta")).toBe("2\\theta ");
  });

  it("converts the unicode π and θ symbols too", () => {
    expect(textToTex("8π")).toBe("8\\pi ");
    expect(textToTex("Aπ")).toBe("A\\pi ");
    expect(textToTex("2θ")).toBe("2\\theta ");
  });

  it("does NOT match when followed by another letter (so pip, thetax, epsilon stay intact)", () => {
    expect(textToTex("pip")).toBe("pip");
    expect(textToTex("thetax")).toBe("thetax");
    expect(textToTex("epsilon")).toBe("epsilon");
    expect(textToTex("topix")).toBe("topix");
  });

  it("does NOT double-escape an already-escaped \\pi (recursive textToTex inside sqrt)", () => {
    // The inner of `\sqrt{...}` is processed via a recursive textToTex call.
    // If a previous pass produced `\pi`, the second pass must not turn it
    // into `\\pi`.
    expect(textToTex("sqrt(pi)")).toBe("\\sqrt{\\pi }");
    // Already-escaped input stays unchanged.
    expect(textToTex("\\pi")).toBe("\\pi");
  });
});

describe("textToTex — function calls (sqrt / sin / cos / tan)", () => {
  it("wraps balanced calls regardless of digit prefix", () => {
    expect(textToTex("sqrt(2)")).toBe("\\sqrt{2}");
    expect(textToTex("2sqrt(3)")).toBe("2\\sqrt{3}");
    expect(textToTex("8sin(theta)")).toBe("8\\sin(\\theta )");
    expect(textToTex("5sqrt(2)+3sqrt(2)")).toBe("5\\sqrt{2}+3\\sqrt{2}");
  });

  it("does NOT wrap when the prefix is a letter (xsqrt could be an identifier)", () => {
    // The whole token stays as-is when it can't be confidently parsed.
    expect(textToTex("xsqrt(3)")).toBe("xsqrt(3)");
  });

  it("normalises bare √n / √x without parentheses", () => {
    expect(textToTex("√3")).toBe("\\sqrt{3}");
    expect(textToTex("√x")).toBe("\\sqrt{x}");
  });
});

describe("textToTex — combined real-world inputs", () => {
  it.each([
    ["r=√(Aπ)", "r=\\sqrt{A\\pi }"],
    ["r=√((a)/(π))", "r=\\sqrt{\\frac{a}{\\pi }}"],
    ["8θ√(2)", "8\\theta \\sqrt{2}"],
    ["(a/pi)^(1/2)", "(\\frac{a}{\\pi} )^{\\frac{1}{2}}"],
  ])("%s -> %s", (input, expected) => {
    expect(textToTex(input)).toBe(expected);
  });
});

describe("previewKatex", () => {
  it("returns kind: tex for valid expressions", () => {
    const r = previewKatex("(3)/(4)");
    expect(r.kind).toBe("tex");
  });

  it("falls back gracefully on malformed input rather than throwing", () => {
    // Wildly broken input should not crash the preview.
    expect(() => previewKatex("\\frac{}{}{")).not.toThrow();
  });

  it("returns the plain-text variant for an empty input (no KaTeX render)", () => {
    const r = previewKatex("");
    expect(r.kind).not.toBe("tex");
  });
});
