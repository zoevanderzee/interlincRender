
#!/bin/bash
echo "🚀 Starting production server..."

# Source nix environment properly
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh 2>/dev/null || true
. ~/.nix-profile/etc/profile.d/nix.sh 2>/dev/null || true
hash -r 2>/dev/null || true

# Ensure npm is available
export PATH="/nix/var/nix/profiles/default/bin:$PATH"

# Start the server
NODE_ENV=production node dist/index.js
