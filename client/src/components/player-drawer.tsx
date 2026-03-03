import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PlayerSummary } from "@/lib/types";

const hitTypeColors: Record<string, string> = {
  elite: "bg-[#d4af37]/20 text-[#b8960e] dark:bg-[#d4af37]/30 dark:text-[#d4af37]",
  starter: "bg-[#0b3a7a]/10 text-[#0b3a7a] dark:bg-[#0b3a7a]/30 dark:text-[#5a9be6]",
  flex: "bg-[#0b3a7a]/5 text-[#0b3a7a]/70 dark:bg-[#1a3a6a]/30 dark:text-[#8ab4e8]",
  bust: "bg-[#7a3a3a]/10 text-[#7a3a3a] dark:bg-[#7a3a3a]/20 dark:text-[#d4837a]",
};

interface PlayerDrawerProps {
  player: PlayerSummary;
  onClose: () => void;
}

export function PlayerDrawer({ player, onClose }: PlayerDrawerProps) {
  const firstHitSeason = player.breakout_year
    ? player.rookie_year + player.breakout_year - 1
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="player-drawer">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#0a1628] shadow-2xl overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 bg-[#0b3a7a] dark:bg-[#0f1d33] p-4 text-white z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold" data-testid="text-player-name">{player.player_name}</h2>
              <div className="w-8 h-[2px] bg-[#d4af37] mt-0.5 rounded-full" />
              <div className="flex items-center gap-2 mt-1.5 text-sm">
                <span className="font-medium">{player.pos}</span>
                <span className="opacity-60">|</span>
                <span className="opacity-80">Class of {player.rookie_year}</span>
                <span className="opacity-60">|</span>
                <span className="opacity-80">Rd {player.rookie_round}, Pick {player.rookie_pick}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              data-testid="button-close-drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/30 dark:bg-muted/20 rounded-md p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</div>
              <Badge variant="secondary" className={`mt-1 text-xs ${hitTypeColors[player.hit_type]}`}>
                {player.hit_type.charAt(0).toUpperCase() + player.hit_type.slice(1)}
              </Badge>
            </div>
            <div className="bg-muted/30 dark:bg-muted/20 rounded-md p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Best Finish</div>
              <div className="text-sm font-bold text-[#0b3a7a] dark:text-white mt-1">{player.best_finish}</div>
            </div>
            <div className="bg-muted/30 dark:bg-muted/20 rounded-md p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Breakout</div>
              <div className="text-sm font-bold text-[#0b3a7a] dark:text-white mt-1">
                {player.breakout_time ? `Year ${player.breakout_time}` : "N/A"}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#0b3a7a] dark:text-white mb-2">Season History</h3>
            <div className="w-8 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#d4af37]/50 mb-3 rounded-full" />
            <div className="space-y-1">
              {player.seasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No qualifying seasons</p>
              ) : (
                player.seasons
                  .sort((a, b) => a.season - b.season)
                  .map((s) => {
                    const isFirstHit = firstHitSeason === s.season;
                    return (
                      <div
                        key={s.season}
                        className={`flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                          isFirstHit
                            ? "bg-[#d4af37]/10 ring-1 ring-[#d4af37]/30 dark:bg-[#d4af37]/15"
                            : "bg-muted/20 dark:bg-muted/10"
                        }`}
                        data-testid={`season-${s.season}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium tabular-nums">{s.season}</span>
                          {isFirstHit && (
                            <span className="text-[10px] font-bold text-[#d4af37] uppercase tracking-wider">First Hit</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">{s.games} GP</span>
                          <span className="font-bold text-[#0b3a7a] dark:text-white">
                            {s.pos}{s.pos_rank}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
