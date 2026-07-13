import { useState } from "react";
import headshots from "@/lib/player-headshots.json";

const headshotMap = headshots as Record<string, string>;

function sleeperHeadshotUrl(sleeperId: string): string {
  return `https://sleepercdn.com/content/nfl/players/thumb/${sleeperId}.jpg`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface PlayerAvatarProps {
  playerId: string;
  playerName: string;
  className?: string;
}

/**
 * Circular player headshot sourced from the Sleeper CDN (mapped by player id),
 * with an initials fallback when no headshot is mapped or the image 404s/403s.
 */
export function PlayerAvatar({ playerId, playerName, className = "" }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const sleeperId = headshotMap[playerId];
  const showImg = sleeperId && !failed;

  return (
    <span
      className={`inline-grid place-items-center h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-black/5 dark:ring-white/10 ${className}`}
      aria-hidden="true"
    >
      {showImg ? (
        <img
          src={sleeperHeadshotUrl(sleeperId)}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span className="text-[9px] font-bold text-muted-foreground">{initials(playerName)}</span>
      )}
    </span>
  );
}
