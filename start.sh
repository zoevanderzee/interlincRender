
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure we're in a nix-shell with Node.js
exec nix-shell -p nodejs_20 --run "NODE_ENV=production node dist/index.js"
