
#!/bin/bash
echo "🏗️ Building for production..."

# Ensure Node.js is available from nix-shell
echo "📦 Setting up Node.js environment..."
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
nix-shell -p nodejs_20 --run "npm install && npm run build"

echo "✅ Build completed successfully!"
