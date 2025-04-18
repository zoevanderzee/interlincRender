
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure Node.js is available from nix-shell
echo "📦 Setting up Node.js environment..."
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
nix-shell -p nodejs_20 --run "NODE_ENV=production node dist/index.js"
