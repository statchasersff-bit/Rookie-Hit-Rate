// Bundled NFL team logos, resolved through Vite so URLs respect the build's base
// path and get content-hashed. Keyed by team abbreviation (e.g. "KC", "WAS").
const logoModules = import.meta.glob<string>("../assets/logos/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const teamLogos: Record<string, string> = Object.fromEntries(
  Object.entries(logoModules).map(([path, url]) => {
    const code = path.split("/").pop()!.replace(".png", "");
    return [code, url];
  })
);

// Normalize alternate team abbreviations to the canonical code used for logos
// and labels (e.g. some source data uses "JAC" for Jacksonville, we show "JAX").
const teamAliases: Record<string, string> = {
  JAC: "JAX",
};

interface TeamLogoProps {
  team: string;
  /** Show the team abbreviation next to the logo. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Renders a bundled NFL team logo with the abbreviation as an accessible label,
 * falling back to a text badge for free agents or any team without a logo asset.
 */
export function TeamLogo({ team: rawTeam, showLabel = true, className = "" }: TeamLogoProps) {
  const team = teamAliases[rawTeam] ?? rawTeam;
  const url = team && team !== "FA" ? teamLogos[team] : undefined;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {url ? (
        <img
          src={url}
          alt=""
          aria-hidden="true"
          width={20}
          height={20}
          loading="lazy"
          className="h-[calc(var(--rhr-fs,14px)*1.429)] w-[calc(var(--rhr-fs,14px)*1.429)] object-contain shrink-0"
        />
      ) : (
        <span className="grid h-[calc(var(--rhr-fs,14px)*1.429)] w-[calc(var(--rhr-fs,14px)*1.429)] place-items-center rounded-full bg-muted text-[calc(var(--rhr-fs,14px)*0.571)] font-bold text-muted-foreground shrink-0">
          {team === "FA" ? "FA" : team.slice(0, 2)}
        </span>
      )}
      {showLabel && <span>{team}</span>}
    </span>
  );
}
