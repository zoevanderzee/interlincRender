#!/bin/bash
echo "🚀 Starting production server..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed or not in PATH"
  exit 1
fi

# Display Node.js version
echo "📌 Using Node.js $(node --version)"
NODE_ENV=production node dist/index.js
