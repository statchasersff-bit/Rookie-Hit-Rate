// Shared legend for both overview heatmaps (Rookie Hit Rates + Pick Range).
// The whole legend scales down fluidly — up to ~20% — as the available width
// shrinks, so its items stay on a single row as long as possible before wrapping.
// The outer div is the query container; the inner content sizes off it via `cqw`,
// and every dimension (font, swatches, gaps) is expressed in `em` so they scale
// together with the font size.
export function HeatLegend() {
  return (
    <div className="[container-type:inline-size] mt-4">
      <div className="flex flex-wrap items-center justify-center gap-[0.75em] text-[clamp(9.6px,2cqw,12px)] text-muted-foreground">
        <span className="font-medium">Hit Rate:</span>
        <div className="flex items-center gap-[0.33em]">
          <div className="w-[1.33em] h-[1em] rounded-sm bg-slate-100 dark:bg-slate-800/50" />
          <span>0%</span>
        </div>
        <div className="flex items-center gap-[0.33em]">
          <div className="w-[1.33em] h-[1em] rounded-sm bg-[#0b3a7a]/10 dark:bg-[#0b3a7a]/20" />
          <span>15%</span>
        </div>
        <div className="flex items-center gap-[0.33em]">
          <div className="w-[1.33em] h-[1em] rounded-sm bg-[#0b3a7a]/20 dark:bg-[#0b3a7a]/40" />
          <span>30%</span>
        </div>
        <div className="flex items-center gap-[0.33em]">
          <div className="w-[1.33em] h-[1em] rounded-sm bg-[#0b3a7a]/30 dark:bg-[#0b3a7a]/60" />
          <span>50%</span>
        </div>
        <div className="flex items-center gap-[0.33em]">
          <div className="w-[1.33em] h-[1em] rounded-sm bg-[#d4af37]/30 dark:bg-[#d4af37]/30 ring-1 ring-[#d4af37]/50" />
          <span>70%+</span>
        </div>
        <div className="flex items-center gap-[0.75em] whitespace-nowrap">
          <span className="mx-[0.33em]">|</span>
          <span className="font-medium">Confidence:</span>
          <div className="flex items-center gap-[0.33em]"><span className="w-[0.67em] h-[0.67em] rounded-full bg-emerald-500 inline-block" /><span>High</span></div>
          <div className="flex items-center gap-[0.33em]"><span className="w-[0.67em] h-[0.67em] rounded-full bg-amber-400 inline-block" /><span>Med</span></div>
          <div className="flex items-center gap-[0.33em]"><span className="w-[0.67em] h-[0.67em] rounded-full bg-red-400 inline-block" /><span>Low</span></div>
        </div>
      </div>
    </div>
  );
}
