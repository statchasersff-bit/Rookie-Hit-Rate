import { Moon, Sun, LineChart } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "pick-range", label: "Picks" },
  { id: "trends", label: "Trends" },
  { id: "cohorts", label: "Cohorts" },
  { id: "players", label: "Players" },
];

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-40 border-b border-[#d4af37]/25 bg-[#0b1634] text-white shadow-[0_6px_24px_-12px_rgba(7,20,47,0.7)]"
      style={{ backgroundImage: "linear-gradient(180deg, #0b1634 0%, #0e1c3f 55%, #122347 100%)" }}
      data-testid="navbar"
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Brand + tool identity */}
        <div className="flex items-start sm:items-center justify-between gap-3 pt-4 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="https://statchasers.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="StatChasers home"
              className="shrink-0 grid place-items-center h-11 w-11 rounded-xl border border-[#d4af37]/40 bg-white/5 text-[#e3c45b] font-[850] tracking-tight text-lg transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70"
              data-testid="link-logo"
            >
              SC
            </a>
            <div className="min-w-0">
              <div className="scff-eyebrow text-[#d4af37]/90">StatChasers Analytics</div>
              <h1 className="scff-title text-[clamp(1.15rem,2.6vw,1.6rem)] text-white truncate">
                Rookie Hit-Rate Lab
              </h1>
              <p className="hidden sm:block text-[13px] text-white/60 leading-snug mt-0.5 max-w-xl truncate">
                Historical dynasty rookie outcomes by position, round, and draft slot — built for serious drafters.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="shrink-0 grid place-items-center h-9 w-9 rounded-lg border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Tool navigation */}
        <nav
          className="flex items-center gap-1 -mb-px overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label="Analysis views"
          data-testid="nav-tabs"
        >
          <LineChart className="w-4 h-4 text-[#d4af37]/70 shrink-0 mr-1 hidden sm:block" aria-hidden="true" />
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                onClick={() => onTabChange(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`relative whitespace-nowrap px-3 py-2.5 text-[13px] sm:text-sm font-semibold rounded-t-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4af37]/70 ${
                  active
                    ? "text-white"
                    : "text-white/55 hover:text-white/85"
                }`}
              >
                {tab.label}
                <span
                  className={`absolute left-2 right-2 -bottom-px h-[3px] rounded-full transition-all ${
                    active ? "bg-[#d4af37] opacity-100" : "opacity-0"
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
