
#!/bin/bash
echo "🏗️ Building for production..."

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
  echo "Using nix-shell to get Node.js..."
  export PATH="$PATH:$(nix-shell -p nodejs_20 --run 'echo $PATH')"
fi

# Install dependencies
npm install

# Build the client
echo "📱 Building client..."
npm run build

echo "✅ Build completed successfully!"
