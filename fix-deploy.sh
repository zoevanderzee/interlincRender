#!/bin/bash
echo "📦 Fixing deployment configuration..."

# Create .replit file with proper configuration
cat > .replit << 'EOL'
run = "bash ./run.sh"
hidden = [".build", ".config"]

[nix]
channel = "stable-23_05"

[deployment]
build = ["sh", "-c", "./build.sh"]
run = ["sh", "-c", "./start.sh"]
EOL

# Create proper run.sh script for development
cat > run.sh << 'EOL'
#!/bin/bash
echo "🚀 Starting development server..."

# Check if Node.js is in PATH, if not try to find it
if ! command -v node &> /dev/null; then
  echo "⚠️ Node.js not found in PATH, trying to locate it..."
  
  # Try to use nix-shell to get Node.js
  if command -v nix-shell &> /dev/null; then
    echo "🔨 Using nix-shell to create a Node.js environment..."
    exec nix-shell -p nodejs_20 --run "npm run dev"
    exit 0
  fi
fi

# If we got here, try to run npm directly
npm run dev
EOL
chmod +x run.sh

# Update build.sh for production
cat > build.sh << 'EOL'
#!/bin/bash
echo "🏗️ Building for production..."

# Build the client
echo "📱 Building client..."
npm run build

# Success message
echo "✅ Build completed successfully!"
EOL
chmod +x build.sh

# Update start.sh for production
cat > start.sh << 'EOL'
#!/bin/bash
echo "🚀 Starting production server..."
NODE_ENV=production node dist/index.js
EOL
chmod +x start.sh

echo "✅ Deployment configuration fixed!"
echo ""
echo "To deploy your application:"
echo "1. Use the Replit Deploy feature"
echo "2. The application will be built using './build.sh'"
echo "3. The application will be started using './start.sh'"
echo ""
echo "You can start the development server manually by running './run.sh'"