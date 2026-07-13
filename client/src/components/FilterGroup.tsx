import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * A labeled filter group: bold label (hidden on mobile) + a rounded, bordered
 * "strip" that holds the pills. Pills fill width on mobile, natural width ≥sm.
 */
export function FilterGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2 flex-1 sm:flex-none sm:w-auto", className)}>
      <span className="hidden sm:inline text-xs font-bold tracking-[0.02em] text-slate-400/90 flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-0 sm:gap-1 p-1 h-10 rounded-xl bg-[var(--sc-card-soft)] border border-[var(--sc-border)] w-full sm:w-auto">
        {children}
      </div>
    </div>
  );
}

/**
 * The one active/inactive pill className, reused by every chip + the unit toggle.
 * active = brand-blue fill, white text, gold /25 border; inactive = muted text,
 * hover lifts toward blue.
 */
export const pillBaseClass =
  "flex flex-1 sm:flex-none items-center justify-center h-full px-3 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60";

export function pillClass(active: boolean, extra?: string) {
  return cn(
    pillBaseClass,
    active
      ? "bg-[var(--sc-blue)] text-white border border-[#d4af37]/25"
      : "text-[var(--sc-text-muted)] hover:text-[var(--sc-blue)] dark:text-white/40 dark:hover:text-white/70",
    extra,
  );
}
