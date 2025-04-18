
#!/bin/bash
echo "🏗️ Building for production..."

# Source nix profile and ensure Node.js is available
. ~/.nix-profile/etc/profile.d/nix.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
hash -r

# Ensure we're in the project root
cd "$(dirname "$0")"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Build the application
echo "🛠️ Building application..."
npm run build

echo "✅ Build completed!"
