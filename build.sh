
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

# Build the server
echo "🛠️ Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --outdir=dist

echo "✅ Build completed successfully!"
