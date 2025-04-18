
#!/bin/bash
echo "🚀 Starting production server..."

# Source nix profile and activate Node.js
. ~/.nix-profile/etc/profile.d/nix.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"

# Start the server
NODE_ENV=production node dist/index.js
