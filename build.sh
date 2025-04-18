#!/bin/bash
echo "🏗️ Starting build process..."

# Environment detection and setup
echo "⚙️ Setting up environment..."
export NODE_OPTIONS="--max-old-space-size=3072"

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the project using the script in package.json
echo "🔨 Building project..."
npm run build

echo "✅ Build process completed successfully!"