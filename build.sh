
#!/bin/bash
echo "🏗️ Building for production..."

# Source nix environment properly
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh 2>/dev/null || true
. ~/.nix-profile/etc/profile.d/nix.sh 2>/dev/null || true
hash -r 2>/dev/null || true

# Ensure npm is available
export PATH="/nix/var/nix/profiles/default/bin:$PATH"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Build the application
echo "🛠️ Building application..."
npm run build

echo "✅ Build completed!"
