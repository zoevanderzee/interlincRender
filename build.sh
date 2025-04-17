
#!/bin/bash
echo "🏗️ Building for production..."

# Ensure we're using Node.js from nix
export PATH="/nix/store/$(ls -t /nix/store | grep nodejs | head -n1)/bin:$PATH"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the client
echo "📱 Building client..."
npm run build

echo "✅ Build completed successfully!"
