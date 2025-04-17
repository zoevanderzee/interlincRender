
#!/bin/bash
echo "🏗️ Building for production..."

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
  echo "Using nix-shell for Node.js environment..."
  exec nix-shell -p nodejs_20 --run "npm install && npm run build"
else
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
  fi
  
  # Build the client
  echo "📱 Building client..."
  npm run build
fi

echo "✅ Build completed successfully!"
