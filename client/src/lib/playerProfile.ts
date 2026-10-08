// Builds the canonical StatChasers player-profile URL from a player's name, e.g.
// "Josh Allen" -> https://statchasers.com/nfl/players/josh-allen/
//
// The slug mirrors WordPress's sanitize_title(): strip accents, lowercase, drop
// any character that isn't a letter/number/space/hyphen (so periods and
// apostrophes are removed, not replaced), then collapse whitespace to single
// hyphens. Examples:
//   "A.J. Brown"        -> "aj-brown"
//   "De'Von Achane"     -> "devon-achane"
//   "Amon-Ra St. Brown" -> "amon-ra-st-brown"
//   "Michael Pittman Jr." -> "michael-pittman-jr"
export function playerSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // drop apostrophes, periods, etc.
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function playerProfileUrl(name: string): string {
  return `https://statchasers.com/nfl/players/${playerSlug(name)}/`;
}
