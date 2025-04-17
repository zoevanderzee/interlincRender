#!/bin/bash
echo "🚀 Preparing for Deployment on Replit"
echo "===================================="
echo

# Create build.sh for production build
cat > build.sh << 'EOL'
#!/bin/bash
echo "🏗️ Building for production..."

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed or not in PATH"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the client
echo "📱 Building client..."
npm run build

# Success message
echo "✅ Build completed successfully!"
EOL
chmod +x build.sh

# Create start.sh for production startup
cat > start.sh << 'EOL'
#!/bin/bash
echo "🚀 Starting production server..."

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed or not in PATH"
  exit 1
fi

# Start the server
NODE_ENV=production node dist/index.js
EOL
chmod +x start.sh

echo "✅ Deployment preparation complete!"
echo 
echo "To deploy your application on Replit:"
echo "1. Click on the 'Deploy' button in the Replit interface"
echo "2. Configure your deployment with the following settings:"
echo "   - Build Command: ./build.sh"
echo "   - Run Command: ./start.sh"
echo
echo "If you encounter Node.js errors during deployment, please ensure:"
echo "1. Node.js is installed in your Replit environment"
echo "2. The Deploy configuration has access to Node.js"
echo
echo "Note: You may need to manually adjust your .replit configuration if needed."