
#!/bin/bash
echo "🏗️ Building for production..."

# Source nix profile
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh

# Run build commands in nix-shell
nix-shell -p nodejs_20 --run "npm install && npm run build"

echo "✅ Build completed successfully!"
