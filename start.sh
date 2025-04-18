
#!/bin/bash
echo "🚀 Starting production server..."

# Source nix environment to ensure Node.js is available
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh

# Start the server
NODE_ENV=production node dist/index.js
