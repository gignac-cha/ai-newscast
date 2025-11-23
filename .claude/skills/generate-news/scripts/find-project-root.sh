#!/bin/bash
# Find project root directory containing package.json with "ai-newscast" name
# Usage: source scripts/find-project-root.sh

PROJECT_ROOT=$(pwd)
while [ ! -f "package.json" ] || ! grep -q '"name": "ai-newscast"' package.json 2>/dev/null; do
  cd ..
  PROJECT_ROOT=$(pwd)
  if [ "$PROJECT_ROOT" = "/" ]; then
    echo "❌ Error: Could not find project root"
    exit 1
  fi
done
cd "$PROJECT_ROOT"
echo "📁 Working directory: $PROJECT_ROOT"
