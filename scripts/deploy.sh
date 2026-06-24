#!/usr/bin/env bash
set -e

APP_NAME="Slate.app"
BUILT_APP="src-tauri/target/release/bundle/macos/${APP_NAME}"
DEST="/Applications/${APP_NAME}"

echo "Building Slate..."
pnpm tauri build

if [ ! -d "$BUILT_APP" ]; then
  echo "Build output not found at $BUILT_APP"
  exit 1
fi

if pgrep -x "Slate" > /dev/null; then
  echo "Closing running Slate..."
  osascript -e 'quit app "Slate"' 2>/dev/null || true
  for i in 1 2 3 4 5; do
    pgrep -x "Slate" > /dev/null || break
    sleep 0.5
  done
fi

echo "Installing to /Applications..."
rm -rf "$DEST"
cp -R "$BUILT_APP" "$DEST"

echo "Launching..."
open "$DEST"

echo "Done."
