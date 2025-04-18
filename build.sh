
#!/bin/bash
echo "🏗️ Building for production..."

# Ensure npm and Node.js are available from nix-shell
if ! command -v node &> /dev/null; then
  echo "🔨 Setting up Node.js environment..."
  # Start a new nix-shell with Node.js and execute build commands
  exec nix-shell -p nodejs_20 --run "npm install && npm run build"
else
  # Node.js is available, run build directly
  echo "📦 Installing dependencies..."
  npm install
  echo "🛠️ Building application..."
  npm run build
fi

echo "✅ Build completed successfully!"
