#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${NODE:-/Users/jwh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
APP_NAME="Isometric Images"
APP_DIR="$ROOT/release/$APP_NAME.app"
CONTENTS="$APP_DIR/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
MODULE_CACHE="$ROOT/.build/module-cache"

cd "$ROOT"
"$NODE" node_modules/vite/bin/vite.js build

rm -rf "$APP_DIR"
mkdir -p "$MACOS" "$RESOURCES/web" "$MODULE_CACHE"

cp macos/Info.plist "$CONTENTS/Info.plist"
cp -R dist/. "$RESOURCES/web/"

xcrun swiftc \
  -parse-as-library \
  -module-cache-path "$MODULE_CACHE" \
  -framework AppKit \
  -framework WebKit \
  macos/IsometricImages.swift \
  -o "$MACOS/$APP_NAME"

chmod +x "$MACOS/$APP_NAME"

echo "Created $APP_DIR"
