interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "trends", label: "Draft Classes" },
  { id: "cohorts", label: "Year-by-Year" },
  { id: "players", label: "Players" },
];

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <header
      className="relative z-40 border-b border-border bg-transparent"
      data-testid="navbar"
    >
      <div className="max-w-[1380px] mx-auto px-px">
        <nav
          className="flex items-center gap-1 py-2.5 overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label="Analysis views"
          data-testid="nav-tabs"
        >
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
                className={`whitespace-nowrap px-2 sm:px-3.5 py-2 text-[11px] sm:text-sm font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70 ${
                  active
                    ? "bg-[#d4af37] text-[#0b1634] shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
