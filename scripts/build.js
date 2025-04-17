import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting build process...');

// Create dist directory if it doesn't exist
const distDir = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  // Build client side code with Vite
  console.log('📦 Building client assets...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Build server with esbuild
  console.log('📦 Building server code...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}