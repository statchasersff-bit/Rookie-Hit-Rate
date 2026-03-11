import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import logoLight from "@assets/statchasers_logo_light_nobg.png";
import logoDark from "@assets/statchasers_logo_dark_nobg.png";

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
    <header className="sticky top-0 z-50 border-b border-[#0b3a7a]/10 dark:border-[#d4af37]/10 bg-white/95 dark:bg-[#0a1628]/95 backdrop-blur-md" data-testid="navbar">
      <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center shrink-0" data-testid="text-logo">
          <img src={logoLight} alt="StatChasers" className="h-9 w-auto block dark:hidden" />
          <img src={logoDark} alt="StatChasers" className="h-9 w-auto hidden dark:block" />
        </div>

        <nav className="flex items-center gap-1" data-testid="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#0b3a7a] text-white dark:bg-[#d4af37] dark:text-[#0a1628]"
                  : "text-[#0b3a7a]/70 dark:text-[#d4af37]/70 hover:bg-[#0b3a7a]/5 dark:hover:bg-[#d4af37]/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
            className="text-[#0b3a7a] dark:text-[#d4af37]"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
