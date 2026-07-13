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
import PlayerExplorer from "@/pages/player-explorer";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingState() {
  return (
    <div className="space-y-6" data-testid="loading-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading analytics…</span>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, r) => (
              <div key={r} className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, c) => (
                  <Skeleton key={c} className="h-16 rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-72 shrink-0">
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState("overview");
  const { loading } = useData();

  return (
    <div className="scff-app min-h-screen bg-[var(--stc-page)] text-foreground dark:bg-background">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <FilterBar activeTab={activeTab} />
      <main className="max-w-[1380px] mx-auto px-px py-6 sm:py-8">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === "overview" && <Overview />}
            {activeTab === "trends" && <Trends />}
            {activeTab === "cohorts" && <Cohorts />}
            {activeTab === "players" && <PlayerExplorer />}
          </>
        )}
      </main>
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
