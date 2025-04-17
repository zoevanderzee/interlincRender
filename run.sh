#!/bin/bash
echo "🚀 Starting development server..."

# Check if Node.js is in PATH, if not try to find it
if ! command -v node &> /dev/null; then
  echo "⚠️ Node.js not found in PATH, trying to locate it..."
  
  # Try to use nix-shell to get Node.js
  if command -v nix-shell &> /dev/null; then
    echo "🔨 Using nix-shell to create a Node.js environment..."
    exec nix-shell -p nodejs_20 --run "npm run dev"
    exit 0
  fi
fi

# If we got here, try to run npm directly
npm run dev
