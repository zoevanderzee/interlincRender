#!/bin/bash
# This is a clean workflow script for Replit

# Install Node.js and npm if not already available
if ! command -v node &> /dev/null; then
  echo "Node.js not found, attempting to use it from nix-shell..."
  exec nix-shell -p nodejs_20 --run "npm run dev"
  exit $?
fi

# If we get here, Node.js is in the PATH
echo "Node.js found: $(node --version)"
echo "npm found: $(npm --version)"

# Run the application
npm run dev