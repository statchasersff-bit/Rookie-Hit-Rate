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
