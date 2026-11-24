#!/usr/bin/env bash
#
# Build the "StatChasers — Rookie Hit Rates" WordPress plugin.
#
# Pipeline:
#   0. Link player ids in client/public/data (script/link-player-ids.mjs)
#   1. Production Vite build of the client SPA  -> dist/public
#   2. Copy the built app + the two data CSVs into the plugin's app/ folder
#   3. Patch index.html (data base + auto-resize helper)
#   4. Build the page summary (summary/hit-rates-summary.json) from those CSVs
#   5. Zip the plugin folder for upload to WordPress
#
# Output: wordpress-plugin/statchasers-rookie-hit-rates.zip
#
# DATA_ONLY=1 skips steps 1-3 for a data refresh: the app build already in
# app/ is kept and only app/data/*.csv (from client/public/data) and the
# summary are replaced. Use it when only the CSVs changed.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$ROOT/wordpress-plugin/statchasers-rookie-hit-rates"
APP_DIR="$PLUGIN_DIR/app"

echo "==> [0/5] Linking player ids…"
cd "$ROOT"
node script/link-player-ids.mjs

if [ "${DATA_ONLY:-0}" = "1" ]; then
  [ -f "$APP_DIR/index.html" ] || { echo "DATA_ONLY=1 needs an existing app build in $APP_DIR" >&2; exit 1; }
  echo "==> [1-3/5] DATA_ONLY: keeping the app build, copying CSVs…"
  cp "$ROOT/client/public/data/rookie_drafts.csv" "$APP_DIR/data/"
  cp "$ROOT/client/public/data/season_finishes.csv" "$APP_DIR/data/"
else

echo "==> [1/5] Building client (vite)…"
NODE_ENV=production npx vite build

echo "==> [2/5] Copying built app into plugin…"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/data"
cp -r "$ROOT/dist/public/assets" "$APP_DIR/assets"
cp "$ROOT/dist/public/favicon.png" "$APP_DIR/favicon.png"
cp "$ROOT/dist/public/index.html" "$APP_DIR/index.html"
# Only the two CSVs the app actually fetches (rookie_adp.csv is unused).
cp "$ROOT/dist/public/data/rookie_drafts.csv" "$APP_DIR/data/"
cp "$ROOT/dist/public/data/season_finishes.csv" "$APP_DIR/data/"

echo "==> [3/5] Patching index.html for the embed…"
node -e '
const fs = require("fs");
const p = process.argv[1];
let html = fs.readFileSync(p, "utf8");
const inject = [
  "    <!-- Injected for WordPress embed: resolve CSV data relative to this app folder -->",
  "    <script>window.__RHR_DATA_BASE__ = \"./data/\";</script>",
  "    <!-- Neutralize the app root\x27s min-h-screen (100vh) inside the iframe. Otherwise",
  "         100vh resolves to the iframe height the parent already set, pinning the app to",
  "         the tallest tab visited and leaving a huge empty gap under shorter tabs. -->",
  "    <style>html,body{height:auto!important;min-height:0!important}.scff-app{min-height:0!important}</style>",
  "    <script src=\"./embed-resize.js\"></script>",
  "  "
].join("\n");
if (!html.includes("__RHR_DATA_BASE__")) {
  html = html.replace("</head>", inject + "</head>");
}
if (!/<body[^>]*style=/.test(html)) {
  html = html.replace("<body>", "<body style=\"margin:0;background:#f8fafc;\">");
}
fs.writeFileSync(p, html);
console.log("    patched " + p);
' "$APP_DIR/index.html"

# The auto-resize helper's canonical source lives under script/ (app/ is wiped
# and rebuilt each run), so copy it in.
cp "$ROOT/script/wp-embed-resize.js" "$APP_DIR/embed-resize.js"

fi

# The methodology + results table the plugin prints in the page itself, computed
# by the app's own code from the CSVs just copied in. summary/ is outside app/,
# so the rebuild above does not wipe it; this step always rewrites it.
echo "==> [4/5] Building page summary…"
cd "$ROOT"
node script/build-wp-summary.mjs
node script/build-wp-summary.mjs --check >/dev/null

echo "==> [5/5] Zipping plugin…"
cd "$ROOT/wordpress-plugin"
rm -f statchasers-rookie-hit-rates.zip
zip -rqX statchasers-rookie-hit-rates.zip statchasers-rookie-hit-rates -x "*.DS_Store"

echo "==> Done: wordpress-plugin/statchasers-rookie-hit-rates.zip"
ls -lh statchasers-rookie-hit-rates.zip
