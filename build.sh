
#!/bin/bash
echo "🏗️ Building for production..."

# Install dependencies
npm install

# Build client
echo "📱 Building client..."
npm run build

# Build server with ESM support
echo "🛠️ Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

echo "✅ Build completed successfully!"
