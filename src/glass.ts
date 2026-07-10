import type { CSSProperties } from "react";
import type { Theme } from "./themes";

/**
 * The 1px edge of a glass surface.
 *
 * Themes with a gradient stroke paint their edge with the `.glass-stroke` ::before ring,
 * and that ring is inset to the element's PADDING box. A real border would therefore sit
 * one pixel *outside* the ring and read as a faint second contour around the panel — the
 * "extra border" you can see on every card. Those themes get no border at all; the ring
 * is the edge. Flat themes (Ketch, NetApp) keep their hairline.
 */
export const glassEdge = (theme: Theme): CSSProperties =>
  theme.gradientStroke
    ? { borderWidth: 0 }
    : { borderWidth: 1, borderStyle: "solid", borderColor: "var(--bo-border)" };

/** A full glass surface: edge + fill + blur + radius. `blur` picks the weight —
 *  `--bo-blur` for pods and pills, `--bo-blur-lg` for the large panels. */
export const glass = (
  theme: Theme,
  radiusVar: string,
  blur: "--bo-blur" | "--bo-blur-lg" = "--bo-blur",
): CSSProperties => ({
  ...glassEdge(theme),
  backgroundColor: "var(--bo-fill)",
  backdropFilter: `blur(var(${blur}))`,
  WebkitBackdropFilter: `blur(var(${blur}))`,
  boxShadow: "var(--bo-shadow)",
  borderRadius: `var(${radiusVar})`,
});
