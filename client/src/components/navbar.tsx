interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "trends", label: "Trends" },
  { id: "cohorts", label: "Cohorts" },
  { id: "players", label: "Players" },
];

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <header
      className="relative z-40 border-b border-[#d4af37]/25 bg-[#0b1634] text-white shadow-[0_6px_24px_-12px_rgba(7,20,47,0.7)]"
      style={{ backgroundImage: "linear-gradient(180deg, #0b1634 0%, #0e1c3f 55%, #122347 100%)" }}
      data-testid="navbar"
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />
      <div className="max-w-[1380px] mx-auto px-px">
        <nav
          className="flex items-center gap-1 pt-2 -mb-px overflow-x-auto no-scrollbar"
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
                className={`relative whitespace-nowrap px-3 py-3 text-[13px] sm:text-sm font-semibold rounded-t-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4af37]/70 ${
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
