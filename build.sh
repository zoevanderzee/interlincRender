
#!/bin/bash
echo "🏗️ Building for production..."

# Source nix environment
. /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🛠️ Building application..."
npm run build

echo "✅ Build completed!"
