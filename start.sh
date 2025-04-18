
#!/bin/bash
echo "🚀 Starting production server..."

# Source nix profile and ensure Node.js is available
. ~/.nix-profile/etc/profile.d/nix.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
hash -r

# Ensure we're in the project root
cd "$(dirname "$0")"

# Set production environment
export NODE_ENV=production

# Start the server
exec node dist/index.js
