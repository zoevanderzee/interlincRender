// This file contains deployment helpers and environment detection

// Check if we can require Node.js modules
try {
  const fs = require('fs');
  const path = require('path');
  
  // Create the deployment scripts
  createDeploymentScripts();
  
  console.log("✅ Deployment scripts created successfully!");
} catch (error) {
  console.error("❌ Error:", error.message);
  console.log("Cannot run Node.js in this environment. Please ensure Node.js is installed.");
}

// Function to create deployment scripts
function createDeploymentScripts() {
  const fs = require('fs');
  
  // Create build.sh
  const buildScript = `#!/bin/bash
echo "🏗️ Building for production..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the client with Vite
echo "📱 Building client..."
npm run build

echo "✅ Build completed successfully!"
`;

  // Create start.sh
  const startScript = `#!/bin/bash
echo "🚀 Starting production server..."
NODE_ENV=production node dist/index.js
`;

  // Write files
  fs.writeFileSync('build.sh', buildScript, 'utf8');
  fs.chmodSync('build.sh', 0o755); // Make executable
  
  fs.writeFileSync('start.sh', startScript, 'utf8');
  fs.chmodSync('start.sh', 0o755); // Make executable
  
  // Create a better run.sh for development
  const runScript = `#!/bin/bash
echo "🚀 Starting development server..."
npm run dev
`;
  
  fs.writeFileSync('run.sh', runScript, 'utf8');
  fs.chmodSync('run.sh', 0o755); // Make executable
}