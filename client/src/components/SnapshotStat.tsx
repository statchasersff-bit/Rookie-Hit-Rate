import type { ElementType } from "react";
import { kpiCardStyle, kpiIconStyle, type KpiAccent } from "@/lib/kpiCardStyle";

interface SnapshotStatProps {
  label: string;
  value: string | number;
  context: string;
  contextColor?: string;   // a Tailwind text color class, e.g. "text-emerald-400"
  icon: ElementType;       // a lucide-react icon component
  accent: KpiAccent;
  testId?: string;
}

export function SnapshotStat({ label, value, context, contextColor, icon: Icon, accent, testId }: SnapshotStatProps) {
  return (
    <div
      className="sc-premium-kpi rounded-[14px] flex items-center min-h-[72px] p-3 gap-2.5 min-[521px]:min-h-[80px] min-[521px]:px-3.5 min-[521px]:gap-3 min-w-0"
      style={kpiCardStyle(accent)}
      data-testid={testId}
    >
      <div
        className="sc-premium-kpi-icon flex items-center justify-center flex-shrink-0 absolute top-1.5 right-1.5 !w-[22px] !h-[22px] md:relative md:top-auto md:right-auto md:!w-[34px] md:!h-[34px] md:!rounded-[11px]"
        style={kpiIconStyle(accent)}
      >
        <Icon className="w-3 h-3 md:w-4 md:h-4" />
      </div>
      <div className="relative min-w-0 pr-6 md:pr-0">
        <p className="text-[10px] min-[521px]:text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.06em] leading-none">{label}</p>
        <p className="text-[15px] min-[521px]:text-[17px] font-black text-slate-900 dark:text-white leading-none mt-1">{value}</p>
        <p className={`text-[11px] font-medium mt-1 leading-snug ${contextColor || "text-slate-500"}`}>{context}</p>
      </div>
    </div>
  );
}
