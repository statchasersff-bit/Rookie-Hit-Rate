// Shared heatmap fill + text color scale used by BOTH overview tables (Rookie
// Hit Rates and Pick Range Breakdown) so their cells render identically.
// Clearly stepped tiers:
//   0–14% very pale gray · 15–29% pale blue · 30–49% medium blue ·
//   50–69% strong blue · 70%+ soft gold.
export function getHeatColor(rate: number, isDark: boolean): string {
  if (rate >= 0.7) return isDark ? "bg-[#d4af37]/30 text-[#d4af37]" : "bg-[#d4af37]/25 text-[#0b3a7a]";
  if (rate >= 0.5) return isDark ? "bg-[#0b3a7a]/75 text-white" : "bg-[#0b3a7a]/35 text-[#0b3a7a]";
  if (rate >= 0.3) return isDark ? "bg-[#0b3a7a]/45 text-blue-100" : "bg-[#0b3a7a]/18 text-[#0b3a7a]";
  if (rate >= 0.15) return isDark ? "bg-[#0b3a7a]/22 text-blue-300" : "bg-[#0b3a7a]/8 text-[#0b3a7a]/70";
  return isDark ? "bg-slate-800/40 text-slate-400" : "bg-slate-100 text-slate-400";
}
