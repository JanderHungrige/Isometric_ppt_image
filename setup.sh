#!/usr/bin/env bash
# Run this once from the project folder to install dependencies and start the dev server.
# Usage: bash setup.sh

set -e

TARGET="$HOME/Code/isometric images"

# Copy project to ~/Code/isometric images if not already there
if [ "$(pwd)" != "$TARGET" ]; then
  mkdir -p "$TARGET"
  cp -r . "$TARGET/"
  echo "✓ Copied project to $TARGET"
  cd "$TARGET"
fi

# Install deps (prefer npm, fall back to pnpm)
if command -v npm &>/dev/null; then
  npm install
else
  pnpm install
fi

echo ""
echo "✓ Done! Starting dev server..."
npm run dev
