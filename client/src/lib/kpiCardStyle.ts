import type { CSSProperties } from "react";

export type KpiAccent =
  | "gold" | "blue" | "emerald" | "violet" | "rose" | "sky" | "red" | "slate";

interface AccentPalette {
  glow: string;
  iconBg: string;
  iconBorder: string;
  icon: string;       // glyph color on the dark tile
  iconLight: string;  // glyph color on the light tile (darker/more saturated for contrast)
}

const ACCENTS: Record<KpiAccent, AccentPalette> = {
  gold:    { glow: "rgba(212,175,55,0.14)", iconBg: "rgba(212,175,55,0.14)", iconBorder: "rgba(212,175,55,0.22)", icon: "#e7c45a", iconLight: "#b7791f" },
  blue:    { glow: "rgba(59,130,246,0.14)", iconBg: "rgba(37,99,235,0.16)", iconBorder: "rgba(96,165,250,0.20)", icon: "#60a5fa", iconLight: "#2563eb" },
  emerald: { glow: "rgba(16,185,129,0.14)", iconBg: "rgba(16,185,129,0.14)", iconBorder: "rgba(52,211,153,0.20)", icon: "#34d399", iconLight: "#059669" },
  violet:  { glow: "rgba(139,92,246,0.14)", iconBg: "rgba(139,92,246,0.14)", iconBorder: "rgba(167,139,250,0.22)", icon: "#a78bfa", iconLight: "#7c3aed" },
  rose:    { glow: "rgba(244,63,94,0.14)",  iconBg: "rgba(244,63,94,0.13)", iconBorder: "rgba(251,113,133,0.22)", icon: "#fb7185", iconLight: "#e11d48" },
  sky:     { glow: "rgba(56,189,248,0.14)", iconBg: "rgba(56,189,248,0.13)", iconBorder: "rgba(125,211,252,0.22)", icon: "#38bdf8", iconLight: "#0284c7" },
  red:     { glow: "rgba(239,68,68,0.14)",  iconBg: "rgba(239,68,68,0.14)", iconBorder: "rgba(248,113,113,0.22)", icon: "#f87171", iconLight: "#dc2626" },
  slate:   { glow: "rgba(148,163,184,0.10)", iconBg: "rgba(100,116,139,0.16)", iconBorder: "rgba(148,163,184,0.20)", icon: "#94a3b8", iconLight: "#475569" },
};

export function kpiAccent(accent: KpiAccent): AccentPalette {
  return ACCENTS[accent] ?? ACCENTS.blue;
}

/** Inline style for the .sc-premium-kpi surface (sets the radial glow color). */
export function kpiCardStyle(accent: KpiAccent): CSSProperties {
  return { "--kpi-glow": kpiAccent(accent).glow } as CSSProperties;
}

/**
 * Inline style for the .sc-premium-kpi-icon wrap (tint, border, glyph color).
 * Glyph color is exposed as CSS vars (not `color`) so the stylesheet can pick
 * the light- vs dark-theme variant.
 */
export function kpiIconStyle(accent: KpiAccent): CSSProperties {
  const p = kpiAccent(accent);
  return {
    "--kpi-icon-bg": p.iconBg,
    "--kpi-icon-border": p.iconBorder,
    "--kpi-icon": p.icon,
    "--kpi-icon-light": p.iconLight,
  } as CSSProperties;
}
