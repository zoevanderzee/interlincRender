
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure npm and Node.js are available from nix-shell
if ! command -v node &> /dev/null; then
  echo "🔨 Setting up Node.js environment..."
  # Start a new nix-shell with Node.js and execute start command
  exec nix-shell -p nodejs_20 --run "NODE_ENV=production node dist/index.js"
else
  # Node.js is available, start server directly
  NODE_ENV=production node dist/index.js
fi
