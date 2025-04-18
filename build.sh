
#!/bin/bash
echo "🏗️ Building for production..."

# Source nix environment to ensure Node.js is available
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build client
echo "🛠️ Building client..."
npm run build

echo "✅ Build completed!"
