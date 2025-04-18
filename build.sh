
#!/bin/bash
echo "🏗️ Building for production..."

# Ensure we're in a nix-shell with Node.js
exec nix-shell -p nodejs_20 --run "npm install && npm run build"
