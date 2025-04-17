import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Preparing application for deployment...');

try {
  // Build the client side with Vite
  console.log('📦 Building client with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Ensure dist directory exists
  const distDir = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Build server with ESBuild using CommonJS format
  console.log('📦 Building server with ESBuild...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist', 
    { stdio: 'inherit' });
  
  // Create a production .env file if needed
  const envPath = path.resolve(__dirname, '..', '.env.production');
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating production environment file...');
    fs.writeFileSync(envPath, 'NODE_ENV=production\n');
  }
  
  // Create a start script for production
  const startScriptPath = path.resolve(__dirname, '..', 'start.sh');
  console.log('📝 Creating start script...');
  fs.writeFileSync(startScriptPath, `#!/bin/bash
export NODE_ENV=production
node dist/index.js
`);
  
  // Make it executable
  fs.chmodSync(startScriptPath, '755');
  
  console.log('✅ Deployment preparation completed successfully!');
  console.log('To start in production mode: ./start.sh');
} catch (error) {
  console.error('❌ Deployment preparation failed:', error);
  process.exit(1);
}