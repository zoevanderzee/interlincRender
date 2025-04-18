
#!/bin/bash
echo "🏗️ Building for production..."

# Source nix profile and explicitly use Node.js 20
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"

# Run build in nix-shell
exec nix-shell -p nodejs_20 --run "npm install && npm run build"
