import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { DataProvider, useData } from "@/lib/data-context";
import { Navbar } from "@/components/navbar";
import { FilterBar } from "@/components/filter-bar";
import Overview from "@/pages/overview";
import Trends from "@/pages/trends";
import Cohorts from "@/pages/cohorts";
import PickRange from "@/pages/pick-range";
import PlayerExplorer from "@/pages/player-explorer";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

function AppContent() {
  const [activeTab, setActiveTab] = useState("overview");
  const { loading } = useData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <FilterBar />
      <main className="max-w-[1280px] mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4" data-testid="loading-skeleton">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid grid-cols-4 gap-3 mt-6">
              {Array.from({ length: 16 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === "overview" && <Overview />}
            {activeTab === "pick-range" && <PickRange />}
            {activeTab === "trends" && <Trends />}
            {activeTab === "cohorts" && <Cohorts />}
            {activeTab === "players" && <PlayerExplorer />}
          </>
        )}
      </main>

      <section className="border-t border-[#0b3a7a]/10 dark:border-[#d4af37]/10 mt-8" data-testid="cta-section">
        <div className="max-w-[1280px] mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/10 dark:bg-[#d4af37]/15 text-[#d4af37] text-xs font-semibold mb-4">
            #1 Ranked Fantasy Tool Suite
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0b3a7a] dark:text-white mb-2">
            Explore More Fantasy Football Tools
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Rookie Hit Rate is just one tool in the StatChasers Premium suite. Discover trade calculators, rankings, projections, and more to dominate your dynasty leagues.
          </p>
          <a
            href="https://statchasers.com/fantasy-football-tools/"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-cta-tools"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#d4af37] text-[#0a1628] font-bold text-sm hover:bg-[#c4a030] transition-colors shadow-lg shadow-[#d4af37]/20"
          >
            Explore All Tools
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
