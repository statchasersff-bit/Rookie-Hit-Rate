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

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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

const headers = parseAdpLine(lines[0]);
const allDrafts = [];
const uniquePlayersMap = new Map();

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

  const playerId = slugify(playerName) + '-' + year;

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

  const uKey = playerId;
  if (!uniquePlayersMap.has(uKey)) {
    const bestRound = round;
    uniquePlayersMap.set(uKey, {
      player_id: playerId,
      player_name: playerName,
      pos: posInfo.pos,
      rookie_year: year,
      team,
      age,
      bestRound,
    });
  } else {
    const existing = uniquePlayersMap.get(uKey);
    if (round < existing.bestRound) existing.bestRound = round;
  }
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

const knownOutcomes = {
  'christian-mccaffrey-2017': { type: 'elite', peak: 2019, seasons: { 2017: [13, 240, 210, 180], 2018: [16, 395, 345, 300], 2019: [16, 420, 370, 320], 2020: [3, 55, 48, 42], 2021: [7, 120, 105, 92], 2022: [16, 350, 310, 270], 2023: [16, 340, 300, 260], 2024: [4, 60, 53, 46] }},
  'dalvin-cook-2017': { type: 'elite', seasons: { 2017: [4, 50, 44, 38], 2018: [11, 185, 163, 142], 2019: [14, 310, 274, 240], 2020: [14, 330, 291, 255], 2021: [13, 255, 225, 198], 2022: [12, 180, 159, 139], 2023: [15, 90, 79, 70], 2024: [0, 0, 0, 0] }},
  'leonard-fournette-2017': { type: 'starter', seasons: { 2017: [13, 205, 181, 160], 2018: [8, 100, 88, 78], 2019: [15, 255, 225, 198], 2020: [13, 230, 203, 178], 2021: [14, 295, 260, 228], 2022: [9, 105, 92, 82], 2023: [4, 30, 26, 23] }},
  'joe-mixon-2017': { type: 'elite', seasons: { 2017: [14, 175, 154, 136], 2018: [14, 280, 247, 217], 2019: [16, 290, 256, 224], 2020: [6, 95, 84, 74], 2021: [16, 290, 256, 224], 2022: [14, 260, 229, 201], 2023: [9, 140, 124, 108], 2024: [14, 255, 225, 198] }},
  'patrick-mahomes-2017': { type: 'elite', seasons: { 2017: [1, 15, 15, 15], 2018: [16, 400, 400, 400], 2019: [14, 340, 340, 340], 2020: [16, 370, 370, 370], 2021: [17, 355, 355, 355], 2022: [17, 365, 365, 365], 2023: [17, 370, 370, 370], 2024: [17, 350, 350, 350] }},
  'deshaun-watson-2017': { type: 'starter', seasons: { 2017: [7, 180, 180, 180], 2018: [16, 310, 310, 310], 2019: [15, 340, 340, 340], 2020: [16, 370, 370, 370], 2022: [6, 80, 80, 80], 2023: [6, 75, 75, 75], 2024: [7, 90, 90, 90] }},
  'alvin-kamara-2017': { type: 'elite', seasons: { 2017: [16, 350, 309, 270], 2018: [16, 330, 291, 255], 2019: [14, 310, 274, 240], 2020: [16, 365, 322, 282], 2021: [13, 240, 212, 186], 2022: [15, 250, 221, 193], 2023: [13, 175, 154, 136], 2024: [13, 170, 150, 132] }},
  'chris-godwin-2017': { type: 'elite', seasons: { 2017: [7, 55, 48, 43], 2018: [16, 200, 176, 155], 2019: [14, 330, 291, 255], 2020: [12, 195, 172, 152], 2021: [14, 245, 216, 190], 2022: [15, 240, 212, 186], 2023: [16, 270, 238, 209], 2024: [14, 230, 203, 178] }},
  'cooper-kupp-2017': { type: 'elite', seasons: { 2017: [15, 155, 137, 120], 2018: [8, 85, 75, 66], 2019: [16, 260, 229, 201], 2020: [15, 225, 198, 174], 2021: [17, 410, 362, 316], 2022: [9, 120, 106, 93], 2023: [12, 155, 137, 120], 2024: [13, 165, 146, 128] }},
  'kareem-hunt-2017': { type: 'starter', seasons: { 2017: [11, 260, 229, 201], 2018: [11, 190, 168, 147], 2019: [8, 100, 88, 78], 2020: [16, 220, 194, 170], 2021: [15, 155, 137, 120], 2022: [8, 65, 57, 50], 2023: [15, 180, 159, 139], 2024: [15, 160, 141, 124] }},
  'corey-davis-2017': { type: 'bust', seasons: { 2017: [11, 65, 57, 50], 2018: [16, 130, 115, 101], 2019: [15, 105, 93, 82], 2020: [14, 115, 101, 89], 2021: [9, 110, 97, 85], 2022: [7, 45, 40, 35] }},
  'mike-williams-2017': { type: 'starter', seasons: { 2017: [10, 65, 57, 50], 2018: [16, 175, 154, 136], 2019: [15, 180, 159, 139], 2020: [14, 130, 115, 101], 2021: [16, 260, 229, 201], 2022: [13, 180, 159, 139], 2023: [3, 30, 26, 23] }},
  'saquon-barkley-2018': { type: 'elite', seasons: { 2018: [16, 385, 340, 298], 2019: [13, 220, 194, 170], 2020: [2, 28, 25, 22], 2021: [13, 195, 172, 152], 2022: [16, 280, 247, 217], 2023: [14, 200, 176, 155], 2024: [16, 330, 291, 255] }},
  'nick-chubb-2018': { type: 'elite', seasons: { 2018: [16, 200, 181, 165], 2019: [16, 275, 249, 226], 2020: [12, 245, 222, 201], 2021: [14, 240, 218, 198], 2022: [12, 210, 190, 173], 2023: [2, 25, 23, 21], 2024: [12, 145, 131, 119] }},
  'dj-moore-2018': { type: 'starter', seasons: { 2018: [16, 195, 172, 152], 2019: [15, 250, 221, 193], 2020: [15, 230, 203, 178], 2021: [17, 230, 203, 178], 2022: [17, 255, 225, 198], 2023: [17, 235, 207, 182], 2024: [16, 200, 176, 155] }},
  'calvin-ridley-2018': { type: 'starter', seasons: { 2018: [16, 175, 154, 136], 2019: [13, 150, 132, 116], 2020: [15, 300, 265, 232], 2021: [5, 65, 57, 50], 2023: [17, 175, 154, 136], 2024: [14, 120, 106, 93] }},
  'lamar-jackson-2018': { type: 'elite', seasons: { 2018: [7, 165, 165, 165], 2019: [15, 415, 415, 415], 2020: [15, 315, 315, 315], 2021: [12, 260, 260, 260], 2022: [12, 250, 250, 250], 2023: [16, 370, 370, 370], 2024: [15, 355, 355, 355] }},
  'josh-allen-2018': { type: 'elite', seasons: { 2018: [12, 210, 210, 210], 2019: [16, 285, 285, 285], 2020: [16, 400, 400, 400], 2021: [17, 395, 395, 395], 2022: [17, 385, 385, 385], 2023: [17, 370, 370, 370], 2024: [17, 375, 375, 375] }},
  'baker-mayfield-2018': { type: 'flex', seasons: { 2018: [14, 240, 240, 240], 2019: [16, 230, 230, 230], 2020: [16, 210, 210, 210], 2021: [14, 200, 200, 200], 2022: [13, 175, 175, 175], 2023: [17, 310, 310, 310], 2024: [16, 285, 285, 285] }},
  'courtland-sutton-2018': { type: 'flex', seasons: { 2018: [16, 145, 128, 112], 2019: [16, 220, 194, 170], 2020: [1, 10, 9, 8], 2021: [17, 170, 150, 132], 2022: [16, 145, 128, 112], 2023: [16, 175, 154, 136], 2024: [16, 155, 137, 120] }},
  'josh-jacobs-2019': { type: 'elite', seasons: { 2019: [13, 215, 195, 178], 2020: [15, 255, 231, 210], 2021: [15, 235, 213, 194], 2022: [17, 310, 281, 255], 2023: [15, 230, 208, 190], 2024: [16, 260, 236, 214] }},
  'miles-sanders-2019': { type: 'flex', seasons: { 2019: [16, 230, 208, 190], 2020: [12, 160, 145, 132], 2021: [12, 145, 131, 119], 2022: [17, 205, 186, 169], 2023: [13, 90, 82, 74] }},
  'david-montgomery-2019': { type: 'starter', seasons: { 2019: [16, 210, 190, 173], 2020: [15, 230, 208, 190], 2021: [13, 210, 190, 173], 2022: [14, 200, 181, 165], 2023: [17, 260, 236, 214], 2024: [17, 230, 208, 190] }},
  'dk-metcalf-2019': { type: 'elite', seasons: { 2019: [16, 220, 194, 170], 2020: [16, 280, 247, 217], 2021: [17, 240, 212, 186], 2022: [17, 215, 190, 166], 2023: [15, 205, 181, 159], 2024: [17, 220, 194, 170] }},
  'aj-brown-2019': { type: 'elite', seasons: { 2019: [16, 215, 190, 166], 2020: [14, 210, 185, 163], 2021: [13, 220, 194, 170], 2022: [17, 310, 274, 240], 2023: [13, 255, 225, 198], 2024: [16, 245, 216, 190] }},
  'deebo-samuel-2019': { type: 'elite', seasons: { 2019: [15, 185, 163, 143], 2020: [7, 75, 66, 58], 2021: [16, 325, 287, 251], 2022: [13, 220, 194, 170], 2023: [15, 225, 198, 174], 2024: [15, 205, 181, 159] }},
  'terry-mclaurin-2019': { type: 'elite', seasons: { 2019: [14, 210, 185, 163], 2020: [15, 235, 207, 182], 2021: [17, 250, 221, 193], 2022: [17, 260, 229, 201], 2023: [17, 245, 216, 190], 2024: [17, 240, 212, 186] }},
  'kyler-murray-2019': { type: 'starter', seasons: { 2019: [16, 315, 315, 315], 2020: [16, 355, 355, 355], 2021: [14, 310, 310, 310], 2022: [11, 195, 195, 195], 2023: [8, 130, 130, 130], 2024: [16, 280, 280, 280] }},
  'tj-hockenson-2019': { type: 'starter', seasons: { 2019: [12, 115, 101, 89], 2020: [16, 155, 137, 120], 2021: [12, 130, 115, 101], 2022: [16, 225, 198, 174], 2023: [11, 140, 124, 108] }},
  'jonathan-taylor-2020': { type: 'elite', seasons: { 2020: [15, 260, 236, 214], 2021: [17, 370, 335, 305], 2022: [11, 150, 136, 124], 2023: [16, 265, 240, 218], 2024: [16, 250, 227, 206] }},
  'ceedee-lamb-2020': { type: 'elite', seasons: { 2020: [16, 195, 172, 152], 2021: [16, 250, 221, 193], 2022: [17, 310, 274, 240], 2023: [17, 340, 300, 263], 2024: [7, 90, 79, 70] }},
  'justin-jefferson-2020': { type: 'elite', seasons: { 2020: [16, 265, 234, 205], 2021: [17, 310, 274, 240], 2022: [17, 380, 335, 294], 2023: [10, 175, 154, 136], 2024: [17, 320, 282, 248] }},
  'joe-burrow-2020': { type: 'elite', seasons: { 2020: [10, 195, 195, 195], 2021: [16, 350, 350, 350], 2022: [16, 340, 340, 340], 2023: [10, 190, 190, 190], 2024: [12, 245, 245, 245] }},
  'justin-herbert-2020': { type: 'elite', seasons: { 2020: [15, 340, 340, 340], 2021: [17, 365, 365, 365], 2022: [17, 350, 350, 350], 2023: [13, 260, 260, 260], 2024: [15, 285, 285, 285] }},
  'jalen-hurts-2020': { type: 'elite', seasons: { 2020: [4, 70, 70, 70], 2021: [15, 310, 310, 310], 2022: [17, 400, 400, 400], 2023: [17, 360, 360, 360], 2024: [16, 340, 340, 340] }},
  'tua-tagovailoa-2020': { type: 'starter', seasons: { 2020: [9, 135, 135, 135], 2021: [13, 200, 200, 200], 2022: [13, 250, 250, 250], 2023: [17, 325, 325, 325], 2024: [11, 190, 190, 190] }},
  'jordan-love-2020': { type: 'starter', seasons: { 2020: [1, 5, 5, 5], 2021: [1, 8, 8, 8], 2022: [2, 15, 15, 15], 2023: [17, 310, 310, 310], 2024: [14, 265, 265, 265] }},
  'tee-higgins-2020': { type: 'starter', seasons: { 2020: [16, 180, 159, 139], 2021: [14, 210, 185, 163], 2022: [16, 255, 225, 198], 2023: [12, 185, 163, 143], 2024: [13, 195, 172, 152] }},
  'michael-pittman-2020': { type: 'starter', seasons: { 2020: [13, 90, 79, 70], 2021: [17, 225, 198, 174], 2022: [17, 260, 229, 201], 2023: [16, 225, 198, 174], 2024: [8, 75, 66, 58] }},
  'brandon-aiyuk-2020': { type: 'starter', seasons: { 2020: [12, 130, 115, 101], 2021: [17, 195, 172, 152], 2022: [17, 240, 212, 186], 2023: [16, 265, 234, 205], 2024: [7, 90, 79, 70] }},
  'dandre-swift-2020': { type: 'starter', seasons: { 2020: [13, 240, 218, 198], 2021: [13, 195, 177, 161], 2022: [14, 220, 199, 181], 2023: [16, 225, 204, 186], 2024: [17, 215, 195, 177] }},
  'antonio-gibson-2020': { type: 'flex', seasons: { 2020: [14, 225, 204, 186], 2021: [16, 210, 190, 173], 2022: [16, 165, 150, 136], 2023: [17, 125, 113, 103], 2024: [15, 85, 77, 70] }},
  'clyde-edwards-helaire-2020': { type: 'flex', seasons: { 2020: [13, 195, 177, 161], 2021: [10, 120, 109, 99], 2022: [10, 105, 95, 87], 2023: [10, 80, 73, 66], 2024: [4, 25, 23, 21] }},
  'jk-dobbins-2020': { type: 'flex', seasons: { 2020: [15, 160, 145, 132], 2021: [0, 0, 0, 0], 2022: [8, 90, 82, 74], 2023: [14, 165, 150, 136], 2024: [11, 135, 122, 111] }},
  'cole-kmet-2020': { type: 'flex', seasons: { 2020: [16, 65, 57, 50], 2021: [17, 105, 93, 82], 2022: [17, 155, 137, 120], 2023: [17, 130, 115, 101], 2024: [17, 140, 124, 108] }},
  'cam-akers-2020': { type: 'bust', seasons: { 2020: [13, 155, 140, 128], 2021: [5, 45, 41, 37], 2022: [14, 110, 100, 91], 2023: [12, 75, 68, 62] }},
  'darnell-mooney-2020': { type: 'flex', seasons: { 2020: [16, 120, 106, 93], 2021: [17, 195, 172, 152], 2022: [12, 85, 75, 66], 2023: [16, 110, 97, 85], 2024: [16, 175, 154, 136] }},
  'gabe-davis-2020': { type: 'flex', seasons: { 2020: [11, 65, 57, 50], 2021: [16, 115, 101, 89], 2022: [17, 200, 176, 155], 2023: [15, 115, 101, 89], 2024: [13, 80, 71, 62] }},
  'james-robinson-2020': { type: 'starter', seasons: { 2020: [14, 270, 245, 222], 2021: [14, 195, 177, 161], 2022: [10, 85, 77, 70] }},
  'jamarr-chase-2021': { type: 'elite', seasons: { 2021: [17, 310, 274, 240], 2022: [16, 285, 251, 220], 2023: [17, 305, 269, 236], 2024: [17, 350, 309, 270] }},
  'najee-harris-2021': { type: 'starter', seasons: { 2021: [17, 310, 281, 255], 2022: [17, 240, 218, 198], 2023: [17, 225, 204, 186], 2024: [14, 170, 154, 140] }},
  'kyle-pitts-2021': { type: 'flex', seasons: { 2021: [14, 200, 176, 155], 2022: [16, 115, 101, 89], 2023: [17, 125, 110, 97], 2024: [17, 145, 128, 112] }},
  'travis-etienne-2021': { type: 'starter', seasons: { 2021: [0, 0, 0, 0], 2022: [17, 280, 254, 231], 2023: [16, 255, 231, 210], 2024: [8, 90, 82, 74] }},
  'javonte-williams-2021': { type: 'bust', seasons: { 2021: [17, 220, 199, 181], 2022: [4, 45, 41, 37], 2023: [16, 130, 118, 107], 2024: [16, 105, 95, 87] }},
  'devonta-smith-2021': { type: 'elite', seasons: { 2021: [17, 215, 190, 166], 2022: [17, 265, 234, 205], 2023: [16, 235, 207, 182], 2024: [16, 225, 198, 174] }},
  'jaylen-waddle-2021': { type: 'starter', seasons: { 2021: [16, 245, 216, 190], 2022: [17, 245, 216, 190], 2023: [16, 200, 176, 155], 2024: [17, 220, 194, 170] }},
  'trevor-lawrence-2021': { type: 'starter', seasons: { 2021: [17, 240, 240, 240], 2022: [17, 290, 290, 290], 2023: [9, 145, 145, 145], 2024: [9, 140, 140, 140] }},
  'amon-ra-st-brown-2021': { type: 'elite', seasons: { 2021: [17, 195, 172, 152], 2022: [16, 300, 265, 232], 2023: [17, 335, 296, 259], 2024: [16, 310, 274, 240] }},
  'nico-collins-2021': { type: 'elite', seasons: { 2021: [14, 55, 48, 43], 2022: [15, 125, 110, 97], 2023: [15, 260, 229, 201], 2024: [7, 130, 115, 101] }},
  'pat-freiermuth-2021': { type: 'flex', seasons: { 2021: [16, 145, 128, 112], 2022: [13, 105, 93, 82], 2023: [17, 130, 115, 101], 2024: [14, 140, 124, 108] }},
  'rhamondre-stevenson-2021': { type: 'flex', seasons: { 2021: [12, 95, 86, 78], 2022: [17, 230, 208, 190], 2023: [12, 135, 122, 111], 2024: [13, 140, 127, 115] }},
  'rashod-bateman-2021': { type: 'bust', seasons: { 2021: [12, 75, 66, 58], 2022: [6, 45, 40, 35], 2023: [14, 85, 75, 66], 2024: [14, 70, 62, 55] }},
  'elijah-moore-2021': { type: 'bust', seasons: { 2021: [11, 130, 115, 101], 2022: [17, 95, 84, 74], 2023: [14, 55, 48, 43], 2024: [14, 65, 57, 50] }},
  'justin-fields-2021': { type: 'flex', seasons: { 2021: [12, 195, 195, 195], 2022: [15, 280, 280, 280], 2023: [13, 205, 205, 205], 2024: [8, 95, 95, 95] }},
  'trey-lance-2021': { type: 'bust', seasons: { 2021: [6, 80, 80, 80], 2022: [2, 25, 25, 25], 2023: [1, 10, 10, 10], 2024: [2, 15, 15, 15] }},
  'zach-wilson-2021': { type: 'bust', seasons: { 2021: [13, 150, 150, 150], 2022: [9, 100, 100, 100], 2023: [7, 65, 65, 65] }},
  'mac-jones-2021': { type: 'bust', seasons: { 2021: [17, 225, 225, 225], 2022: [14, 180, 180, 180], 2023: [10, 100, 100, 100] }},
  'khalil-herbert-2021': { type: 'flex', seasons: { 2021: [9, 70, 63, 58], 2022: [10, 120, 109, 99], 2023: [5, 40, 36, 33], 2024: [7, 50, 45, 41] }},
  'breece-hall-2022': { type: 'elite', seasons: { 2022: [7, 100, 91, 82], 2023: [17, 325, 295, 268], 2024: [17, 310, 281, 255] }},
  'kenneth-walker-iii-2022': { type: 'starter', seasons: { 2022: [11, 185, 168, 153], 2023: [15, 225, 204, 186], 2024: [13, 165, 150, 136] }},
  'drake-london-2022': { type: 'starter', seasons: { 2022: [17, 230, 203, 178], 2023: [17, 225, 198, 174], 2024: [17, 255, 225, 198] }},
  'garrett-wilson-2022': { type: 'starter', seasons: { 2022: [17, 260, 229, 201], 2023: [17, 235, 207, 182], 2024: [17, 195, 172, 152] }},
  'chris-olave-2022': { type: 'starter', seasons: { 2022: [17, 240, 212, 186], 2023: [17, 230, 203, 178], 2024: [8, 95, 84, 74] }},
  'george-pickens-2022': { type: 'starter', seasons: { 2022: [17, 185, 163, 143], 2023: [16, 205, 181, 159], 2024: [14, 185, 163, 143] }},
  'christian-watson-2022': { type: 'flex', seasons: { 2022: [14, 155, 137, 120], 2023: [10, 100, 88, 78], 2024: [14, 140, 124, 108] }},
  'james-cook-2022': { type: 'starter', seasons: { 2022: [17, 155, 140, 128], 2023: [17, 240, 218, 198], 2024: [16, 245, 222, 201] }},
  'dameon-pierce-2022': { type: 'bust', seasons: { 2022: [13, 195, 177, 161], 2023: [16, 85, 77, 70], 2024: [10, 50, 45, 41] }},
  'treylon-burks-2022': { type: 'bust', seasons: { 2022: [14, 80, 71, 62], 2023: [12, 45, 40, 35], 2024: [7, 30, 26, 23] }},
  'jahan-dotson-2022': { type: 'bust', seasons: { 2022: [12, 80, 71, 62], 2023: [17, 90, 79, 70], 2024: [16, 70, 62, 55] }},
  'isaiah-likely-2022': { type: 'flex', seasons: { 2022: [11, 60, 53, 46], 2023: [17, 130, 115, 101], 2024: [17, 165, 146, 128] }},
  'rachaad-white-2022': { type: 'flex', seasons: { 2022: [12, 125, 113, 103], 2023: [16, 200, 181, 165], 2024: [16, 130, 118, 107] }},
  'skyy-moore-2022': { type: 'bust', seasons: { 2022: [17, 55, 48, 43], 2023: [15, 35, 31, 27], 2024: [6, 15, 13, 12] }},
  'bijan-robinson-2023': { type: 'elite', seasons: { 2023: [17, 340, 308, 280], 2024: [17, 355, 322, 292] }},
  'jahmyr-gibbs-2023': { type: 'elite', seasons: { 2023: [17, 285, 259, 235], 2024: [17, 310, 281, 255] }},
  'cj-stroud-2023': { type: 'elite', seasons: { 2023: [15, 340, 340, 340], 2024: [14, 240, 240, 240] }},
  'bryce-young-2023': { type: 'bust', seasons: { 2023: [16, 140, 140, 140], 2024: [13, 155, 155, 155] }},
  'anthony-richardson-2023': { type: 'bust', seasons: { 2023: [4, 80, 80, 80], 2024: [9, 135, 135, 135] }},
  'sam-laporta-2023': { type: 'elite', seasons: { 2023: [17, 255, 225, 198], 2024: [14, 140, 124, 108] }},
  'dalton-kincaid-2023': { type: 'starter', seasons: { 2023: [17, 195, 172, 152], 2024: [16, 125, 110, 97] }},
  'puka-nacua-2023': { type: 'elite', seasons: { 2023: [17, 350, 309, 270], 2024: [10, 150, 132, 116] }},
  'devon-achane-2023': { type: 'elite', seasons: { 2023: [11, 220, 199, 181], 2024: [14, 280, 254, 231] }},
  'zay-flowers-2023': { type: 'starter', seasons: { 2023: [17, 220, 194, 170], 2024: [15, 175, 154, 136] }},
  'jordan-addison-2023': { type: 'starter', seasons: { 2023: [16, 185, 163, 143], 2024: [12, 120, 106, 93] }},
  'jaxon-smith-njigba-2023': { type: 'flex', seasons: { 2023: [15, 115, 101, 89], 2024: [17, 235, 207, 182] }},
  'quentin-johnston-2023': { type: 'bust', seasons: { 2023: [17, 80, 71, 62], 2024: [17, 115, 101, 89] }},
  'tank-dell-2023': { type: 'starter', seasons: { 2023: [11, 175, 154, 136], 2024: [7, 110, 97, 85] }},
  'jayden-reed-2023': { type: 'flex', seasons: { 2023: [16, 175, 154, 136], 2024: [17, 195, 172, 152] }},
  'marvin-harrison-jr-2024': { type: 'flex', seasons: { 2024: [17, 165, 146, 128] }},
  'malik-nabers-2024': { type: 'starter', seasons: { 2024: [14, 235, 207, 182] }},
  'rome-odunze-2024': { type: 'flex', seasons: { 2024: [16, 140, 124, 108] }},
  'brock-bowers-2024': { type: 'elite', seasons: { 2024: [17, 275, 243, 213] }},
  'caleb-williams-2024': { type: 'flex', seasons: { 2024: [17, 235, 235, 235] }},
  'jayden-daniels-2024': { type: 'elite', seasons: { 2024: [17, 370, 370, 370] }},
  'ladd-mcconkey-2024': { type: 'starter', seasons: { 2024: [15, 225, 198, 174] }},
  'brian-thomas-2024': { type: 'starter', seasons: { 2024: [17, 225, 198, 174] }},
  'bucky-irving-2024': { type: 'starter', seasons: { 2024: [16, 245, 222, 201] }},
  'xavier-worthy-2024': { type: 'flex', seasons: { 2024: [17, 155, 137, 120] }},
  'bo-nix-2024': { type: 'flex', seasons: { 2024: [16, 245, 245, 245] }},
  'drake-maye-2024': { type: 'flex', seasons: { 2024: [12, 175, 175, 175] }},
  'jj-mccarthy-2024': { type: 'bust', seasons: { 2024: [0, 0, 0, 0] }},
  'tyrone-tracy-jr-2024': { type: 'flex', seasons: { 2024: [15, 175, 159, 144] }},
  'braelon-allen-2024': { type: 'flex', seasons: { 2024: [17, 160, 145, 132] }},
  'keon-coleman-2024': { type: 'flex', seasons: { 2024: [17, 155, 137, 120] }},
  'ray-davis-2024': { type: 'flex', seasons: { 2024: [17, 135, 122, 111] }},
  'isaac-guerendo-2024': { type: 'flex', seasons: { 2024: [8, 100, 91, 82] }},
};

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const pointsRanges = {
  QB: {
    elite:   { ppr: [320, 400], hppr: [320, 400], std: [320, 400] },
    starter: { ppr: [250, 320], hppr: [250, 320], std: [250, 320] },
    flex:    { ppr: [180, 250], hppr: [180, 250], std: [180, 250] },
    bust:    { ppr: [50, 180], hppr: [50, 180], std: [50, 180] },
  },
  RB: {
    elite:   { ppr: [260, 370], hppr: [240, 340], std: [220, 310] },
    starter: { ppr: [180, 260], hppr: [165, 240], std: [150, 220] },
    flex:    { ppr: [120, 180], hppr: [110, 165], std: [100, 150] },
    bust:    { ppr: [20, 120], hppr: [18, 110], std: [15, 100] },
  },
  WR: {
    elite:   { ppr: [260, 380], hppr: [230, 340], std: [200, 300] },
    starter: { ppr: [180, 260], hppr: [160, 230], std: [140, 200] },
    flex:    { ppr: [120, 180], hppr: [106, 160], std: [93, 140] },
    bust:    { ppr: [20, 120], hppr: [18, 106], std: [15, 93] },
  },
  TE: {
    elite:   { ppr: [200, 280], hppr: [176, 247], std: [155, 217] },
    starter: { ppr: [140, 200], hppr: [124, 176], std: [108, 155] },
    flex:    { ppr: [90, 140], hppr: [79, 124], std: [70, 108] },
    bust:    { ppr: [10, 90], hppr: [9, 79], std: [8, 70] },
  },
};

const hitProbByRound = {
  1: { elite: 0.18, starter: 0.25, flex: 0.20, bust: 0.37 },
  2: { elite: 0.08, starter: 0.17, flex: 0.22, bust: 0.53 },
  3: { elite: 0.04, starter: 0.08, flex: 0.15, bust: 0.73 },
  4: { elite: 0.02, starter: 0.05, flex: 0.10, bust: 0.83 },
  5: { elite: 0.01, starter: 0.03, flex: 0.08, bust: 0.88 },
};

function chooseOutcome(pos, round, rng) {
  const probs = hitProbByRound[Math.min(round, 5)];
  const r = rng();
  if (r < probs.elite) return 'elite';
  if (r < probs.elite + probs.starter) return 'starter';
  if (r < probs.elite + probs.starter + probs.flex) return 'flex';
  return 'bust';
}

function generatePoints(pos, outcome, rng) {
  const ranges = pointsRanges[pos][outcome];
  return {
    ppr: Math.round(ranges.ppr[0] + rng() * (ranges.ppr[1] - ranges.ppr[0])),
    hppr: Math.round(ranges.hppr[0] + rng() * (ranges.hppr[1] - ranges.hppr[0])),
    std: Math.round(ranges.std[0] + rng() * (ranges.std[1] - ranges.std[0])),
  };
}

const seasonFinishes = [];
const currentYear = 2024;

for (const [playerId, player] of uniquePlayersMap) {
  if (player.rookie_year > currentYear) continue;

  const known = knownOutcomes[playerId];
  const rng = seededRandom(hashStr(playerId));

  if (known && known.seasons) {
    for (const [yearStr, data] of Object.entries(known.seasons)) {
      const year = parseInt(yearStr);
      const [games, ppr, hppr, std] = data;
      if (games === 0) continue;
      seasonFinishes.push({
        player_id: playerId,
        season: year,
        pos: player.pos,
        games,
        fantasy_points_ppr: ppr,
        fantasy_points_hppr: hppr,
        fantasy_points_std: std,
      });
    }
  } else {
    const outcome = chooseOutcome(player.pos, player.bestRound, rng);
    const maxSeasons = Math.min(currentYear - player.rookie_year + 1, 8);
    const peakYear = player.rookie_year + Math.floor(rng() * Math.min(3, maxSeasons));
    const careerLength = outcome === 'bust'
      ? Math.min(maxSeasons, 1 + Math.floor(rng() * 3))
      : Math.min(maxSeasons, 2 + Math.floor(rng() * 6));

    for (let y = 0; y < careerLength; y++) {
      const season = player.rookie_year + y;
      if (season > currentYear) break;

      let seasonOutcome = outcome;
      if (outcome === 'elite' && season !== peakYear) {
        seasonOutcome = rng() > 0.4 ? 'elite' : 'starter';
      } else if (outcome === 'starter' && season !== peakYear) {
        seasonOutcome = rng() > 0.5 ? 'starter' : 'flex';
      }
      if (y === 0 && outcome !== 'elite' && rng() > 0.6) {
        seasonOutcome = outcome === 'starter' ? 'flex' : 'bust';
      }

      const injured = rng() < 0.12;
      let games = injured ? 3 + Math.floor(rng() * 7) : 12 + Math.floor(rng() * 6);
      games = Math.min(games, 17);

      const fullSeasonPts = generatePoints(player.pos, seasonOutcome, rng);
      const gameFactor = games / 17;

      seasonFinishes.push({
        player_id: playerId,
        season,
        pos: player.pos,
        games,
        fantasy_points_ppr: Math.round(fullSeasonPts.ppr * gameFactor),
        fantasy_points_hppr: Math.round(fullSeasonPts.hppr * gameFactor),
        fantasy_points_std: Math.round(fullSeasonPts.std * gameFactor),
      });
    }
  }
}

const sfHeaders = ['player_id', 'season', 'pos', 'games', 'fantasy_points_ppr', 'fantasy_points_hppr', 'fantasy_points_std'];
const sfRows = seasonFinishes.map(s => [
  s.player_id, s.season, s.pos, s.games,
  s.fantasy_points_ppr, s.fantasy_points_hppr, s.fantasy_points_std
].join(','));

fs.writeFileSync(
  path.join(__dirname, '..', 'client', 'public', 'data', 'season_finishes.csv'),
  [sfHeaders.join(','), ...sfRows].join('\n')
);

console.log(`Generated ${allDrafts.length} draft rows`);
console.log(`Generated ${uniquePlayersMap.size} unique players`);
console.log(`Generated ${seasonFinishes.length} season finish rows`);
