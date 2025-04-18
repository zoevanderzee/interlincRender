
#!/bin/bash
echo "🚀 Starting production server..."

# Source nix profile
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh

# Run server in nix-shell
nix-shell -p nodejs_20 --run "NODE_ENV=production node dist/index.js"
