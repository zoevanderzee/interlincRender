
#!/bin/bash
echo "🏗️ Building for production..."

# Source nix profile and activate Node.js
. ~/.nix-profile/etc/profile.d/nix.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🛠️ Building application..."
npm run build

echo "✅ Build completed!"
