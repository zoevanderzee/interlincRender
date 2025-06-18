#!/usr/bin/env node

// Simple deployment fix script
// This creates a lightweight production build without bundling complexities

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Creating lightweight production build...');

try {
  // Build only the frontend (Vite)
  console.log('Building frontend assets...');
  execSync('vite build --mode production', { stdio: 'inherit' });
  
  // Create dist directory if it doesn't exist
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  
  // Copy server files to dist for production
  console.log('Preparing server for production...');
  
  // Create a production entry point that doesn't require bundling
  const prodServer = `
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set NODE_ENV to production
process.env.NODE_ENV = 'production';

// Import and start the server
const serverPath = join(__dirname, '..', 'server', 'index.ts');
import(serverPath).catch(console.error);
`;

  fs.writeFileSync('dist/index.js', prodServer);
  
  console.log('Lightweight production build complete!');
  console.log('Start with: NODE_ENV=production tsx server/index.ts');
  
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}