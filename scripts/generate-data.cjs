const fs = require('fs');
const path = require('path');

const adpCsv = fs.readFileSync(path.join(__dirname, '..', 'client', 'public', 'data', 'rookie_adp.csv'), 'utf8');
const lines = adpCsv.trim().split('\n');

const validPositions = new Set(['QB', 'RB', 'WR', 'TE']);

function parseAdpLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

function extractPos(posField) {
  const match = posField.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return { pos: match[1], posRank: parseInt(match[2]) };
}

function parseAdp(adpStr) {
  const dotIdx = adpStr.indexOf('.');
  if (dotIdx === -1) return { round: 1, pick: 1 };
  const roundStr = adpStr.substring(0, dotIdx);
  const pickStr = adpStr.substring(dotIdx + 1).padEnd(2, '0');
  return { round: parseInt(roundStr), pick: parseInt(pickStr) };
}

function nflverseSlug(name) {
  let n = name.replace(/\./g, '');
  n = n.replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/i, '');
  n = n.trim();
  return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function normalizePlayerName(name) {
  let n = name.trim();
  const knownFixes = {
    'AshtonJeanty': 'Ashton Jeanty',
    'MarvinHarrison Jr': 'Marvin Harrison Jr',
    'MarvinHarrison Jr.': 'Marvin Harrison Jr',
    'NajeeHarris': 'Najee Harris',
    'ClydeEdwards-Helaire': 'Clyde Edwards-Helaire',
    'JonathanTaylor': 'Jonathan Taylor',
    'TrevorLawrence': 'Trevor Lawrence',
    'CalebWilliams': 'Caleb Williams',
  };
  if (knownFixes[n]) return knownFixes[n];
  if (/^[A-Z][a-z]+[A-Z]/.test(n) && !n.includes(' ') && !n.includes('-')) {
    n = n.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

function mapFormat(f) {
  return f === 'SF' ? 'sf' : '1qb';
}
function mapScoring(s) {
  return s === '0.5PPR' ? 'hppr' : s === 'PPR' ? 'ppr' : 'std';
}

const allDrafts = [];

for (let i = 1; i < lines.length; i++) {
  const vals = parseAdpLine(lines[i]);
  if (vals.length < 10) continue;

  const posInfo = extractPos(vals[0]);
  if (!posInfo || !validPositions.has(posInfo.pos)) continue;

  const playerName = normalizePlayerName(vals[1]);
  const year = parseInt(vals[2]);
  if (isNaN(year)) continue;

  const adpFormat = mapFormat(vals[3]);
  const scoringFormat = mapScoring(vals[4]);
  const { round, pick } = parseAdp(vals[5]);
  const team = vals[6] || 'FA';
  const age = vals[7] === '-' || vals[7] === '' ? null : parseInt(vals[7]);
  const height = vals[8] ? vals[8].replace(/"/g, '').trim() : '';
  const weight = vals[9] ? parseInt(vals[9]) : null;

  const playerId = nflverseSlug(playerName);

  allDrafts.push({
    player_id: playerId,
    player_name: playerName,
    pos: posInfo.pos,
    pos_rank: posInfo.posRank,
    rookie_year: year,
    adp_format: adpFormat,
    scoring_format: scoringFormat,
    rookie_round: round,
    rookie_pick: pick,
    current_nfl_team: team,
    current_age: age,
    height,
    weight,
  });
}

const draftHeaders = [
  'player_id', 'player_name', 'pos', 'pos_rank', 'rookie_year',
  'adp_format', 'scoring_format', 'rookie_round', 'rookie_pick',
  'current_nfl_team', 'current_age', 'height', 'weight'
];
const draftRows = allDrafts.map(d => [
  d.player_id, d.player_name, d.pos, d.pos_rank, d.rookie_year,
  d.adp_format, d.scoring_format, d.rookie_round, d.rookie_pick,
  d.current_nfl_team, d.current_age ?? '', d.height, d.weight ?? ''
].join(','));

fs.writeFileSync(
  path.join(__dirname, '..', 'client', 'public', 'data', 'rookie_drafts.csv'),
  [draftHeaders.join(','), ...draftRows].join('\n')
);

const uniqueIds = new Set(allDrafts.map(d => d.player_id));
console.log(`Generated ${allDrafts.length} draft rows`);
console.log(`${uniqueIds.size} unique players`);
