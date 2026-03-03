import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "trends", label: "Trends" },
  { id: "cohorts", label: "Cohorts" },
  { id: "players", label: "Player Explorer" },
];

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-[#0b3a7a]/10 dark:border-[#d4af37]/10 bg-white/95 dark:bg-[#0a1628]/95 backdrop-blur-md" data-testid="navbar">
      <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md bg-[#0b3a7a] dark:bg-[#d4af37] flex items-center justify-center">
              <span className="text-white dark:text-[#0a1628] font-bold text-xs">SC</span>
            </div>
            <span className="font-bold text-[#0b3a7a] dark:text-[#d4af37] text-lg tracking-tight hidden sm:block" data-testid="text-logo">
              StatChasers
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1" data-testid="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
