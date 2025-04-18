const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Update package.json to use specific build and start commands for production
function updatePackageJson() {
  console.log('Updating package.json for production deployment...');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Update build and start scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "build": "vite build",
      "start": "node dist/index.js",
    };
    
    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json updated successfully');
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
  }
}

// Create a production build script
function createBuildScript() {
  console.log('Creating production build script...');
  
  const buildScriptContent = `#!/bin/bash
echo "Starting build process..."

# Build the frontend
echo "Building frontend..."
npm run build

# Create a simple index.js file in dist if it doesn't exist
if [ ! -f "dist/index.js" ]; then
  echo "Creating server entrypoint..."
  cat > dist/index.js << 'EOL'
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, '/')));

// For any other request, send the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
EOL
fi

echo "Build process completed successfully!"
`;
  
  try {
    fs.writeFileSync('build.sh', buildScriptContent);
    fs.chmodSync('build.sh', 0o755); // Make executable
    console.log('✅ build.sh created successfully');
  } catch (error) {
    console.error('❌ Error creating build.sh:', error.message);
  }
}

// Create a production start script
function createStartScript() {
  console.log('Creating production start script...');
  
  const startScriptContent = `#!/bin/bash
echo "Starting application in production mode..."
NODE_ENV=production npm start
`;
  
  try {
    fs.writeFileSync('start.sh', startScriptContent);
    fs.chmodSync('start.sh', 0o755); // Make executable
    console.log('✅ start.sh created successfully');
  } catch (error) {
    console.error('❌ Error creating start.sh:', error.message);
  }
}

// Create .replit configuration
function createReplitConfig() {
  console.log('Creating .replit configuration...');
  
  const replitConfig = `run = ["npm", "run", "dev"]
hidden = [".config", ".git", ".gitignore"]

[nix]
channel = "stable-23_05"

[deployment]
run = ["sh", "-c", "./start.sh"]
build = ["sh", "-c", "./build.sh"]
deploymentTarget = "cloudrun"
`;
  
  try {
    fs.writeFileSync('.replit', replitConfig);
    console.log('✅ .replit configuration created successfully');
  } catch (error) {
    console.error('❌ Error creating .replit configuration:', error.message);
  }
}

// Make sure express is installed - it's needed for the simple server
function ensureExpressInstalled() {
  console.log('Ensuring express is installed...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.dependencies.express) {
      console.log('Adding express dependency to package.json...');
      packageJson.dependencies.express = "^4.18.2";
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    }
    console.log('✅ Express dependency checked');
  } catch (error) {
    console.error('❌ Error checking express dependency:', error.message);
  }
}

// Run all the functions
function main() {
  console.log('🚀 Preparing for deployment...');
  
  updatePackageJson();
  createBuildScript();
  createStartScript();
  createReplitConfig();
  ensureExpressInstalled();
  
  console.log('\n✅ Deployment preparation completed!');
  console.log('\nTo deploy, click the "Deploy" button in Replit and use:');
  console.log('  - Build Command: ./build.sh');
  console.log('  - Run Command: ./start.sh');
}

// Execute the main function
main();