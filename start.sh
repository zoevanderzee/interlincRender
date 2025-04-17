
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
  echo "Using nix-shell for Node.js environment..."
  exec nix-shell -p nodejs_20 --run "NODE_ENV=production node dist/index.js"
else
  NODE_ENV=production node dist/index.js
fi
