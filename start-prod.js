import express from 'express';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startProductionServer() {
  const app = express();
  const port = process.env.PORT || 5000;

  // Import your existing server setup
  const { default: serverApp } = await import('./server/index.ts');
  
  app.use(serverApp);
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`Production server running on port ${port}`);
  });
}

startProductionServer().catch(console.error);