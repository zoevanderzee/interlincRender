
#!/bin/bash
echo "🏗️ Building for production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🛠️ Building application..."
npm run build

echo "✅ Build completed successfully!"
