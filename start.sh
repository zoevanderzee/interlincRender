
#!/bin/bash
echo "🚀 Starting production server..."

# Source nix profile and explicitly use Node.js 20
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"

# Start the server with explicit nix-shell
exec nix-shell -p nodejs_20 --run "NODE_ENV=production node dist/index.js"
