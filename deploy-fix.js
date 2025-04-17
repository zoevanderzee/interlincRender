// deploy-fix.js
// This script attempts to fix the issue with building ESM modules during deployment

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing deployment build issues...');

// Create a modified build script that works with Replit's deployment
const buildScriptContent = `
#!/bin/bash
echo "Starting build process for deployment..."

# Build frontend
echo "Building frontend with Vite..."
npm run build -- --mode production

# Build backend
echo "Building backend..."
node node_modules/.bin/esbuild server/index.ts --platform=node --packages=external --bundle --outdir=dist

echo "Build process completed!"
`;

// Create a startup script for deployment
const startScriptContent = `
#!/bin/bash
echo "Starting application in production mode..."
NODE_ENV=production node dist/index.js
`;

try {
  // Write the build script
  fs.writeFileSync(path.join(__dirname, 'build.sh'), buildScriptContent, 'utf8');
  execSync('chmod +x build.sh');
  console.log('✅ Created build.sh script');
  
  // Write the start script
  fs.writeFileSync(path.join(__dirname, 'start.sh'), startScriptContent, 'utf8');
  execSync('chmod +x start.sh');
  console.log('✅ Created start.sh script');
  
  // Create .env file for production
  fs.writeFileSync(path.join(__dirname, '.env.production'), 'NODE_ENV=production', 'utf8');
  console.log('✅ Created .env.production file');
  
  console.log('\n🚀 Deployment fixes completed successfully!');
  console.log('To deploy, use the Replit Deploy button and set the following:');
  console.log('- Build Command: ./build.sh');
  console.log('- Start Command: ./start.sh');
} catch (error) {
  console.error('❌ Error fixing deployment:', error);
}