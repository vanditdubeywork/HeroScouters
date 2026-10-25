#!/bin/bash
# Usage: shot.sh <hash-route> <outname> [width] [height]
# Takes a headless Chrome screenshot of the running dev server.
ROUTE="$1"; NAME="$2"; W="${3:-1440}"; H="${4:-900}"
OUT="/Users/vanditdubey/.gemini/antigravity/brain/80a9050a-10e9-4d99-b773-df3b4697600c/scratch/shots/$NAME.png"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --window-size="$W,$H" --virtual-time-budget=4000 --screenshot="$OUT" "http://localhost:5173/#$ROUTE" >/dev/null 2>&1
echo "$OUT"
