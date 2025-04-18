
#!/bin/bash
echo "🏗️ Building for production..."

# Install dependencies
npm install

# Build client
echo "📱 Building client..."
npm run build

# Build server
echo "🛠️ Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --outdir=dist

echo "✅ Build completed successfully!"
