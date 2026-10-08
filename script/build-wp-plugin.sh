#!/usr/bin/env bash
#
# Build the "StatChasers — Rookie Hit Rates" WordPress plugin.
#
# Pipeline:
#   1. Production Vite build of the client SPA  -> dist/public
#   2. Copy the built app + the two data CSVs into the plugin's app/ folder
#   3. Patch index.html (data base + auto-resize helper)
#   4. Zip the plugin folder for upload to WordPress
#
# Output: wordpress-plugin/statchasers-rookie-hit-rates.zip
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$ROOT/wordpress-plugin/statchasers-rookie-hit-rates"
APP_DIR="$PLUGIN_DIR/app"

echo "==> [1/4] Building client (vite)…"
cd "$ROOT"
NODE_ENV=production npx vite build

echo "==> [2/4] Copying built app into plugin…"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/data"
cp -r "$ROOT/dist/public/assets" "$APP_DIR/assets"
cp "$ROOT/dist/public/favicon.png" "$APP_DIR/favicon.png"
cp "$ROOT/dist/public/index.html" "$APP_DIR/index.html"
# Only the two CSVs the app actually fetches (rookie_adp.csv is unused).
cp "$ROOT/dist/public/data/rookie_drafts.csv" "$APP_DIR/data/"
cp "$ROOT/dist/public/data/season_finishes.csv" "$APP_DIR/data/"

echo "==> [3/4] Patching index.html for the embed…"
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

echo "==> [4/4] Zipping plugin…"
cd "$ROOT/wordpress-plugin"
rm -f statchasers-rookie-hit-rates.zip
zip -rqX statchasers-rookie-hit-rates.zip statchasers-rookie-hit-rates -x "*.DS_Store"

echo "==> Done: wordpress-plugin/statchasers-rookie-hit-rates.zip"
ls -lh statchasers-rookie-hit-rates.zip
