// Production server entry point
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set environment to production
process.env.NODE_ENV = 'production';

async function startProductionServer() {
  try {
    // Import the built production server
    const { default: app } = await import('./dist/index.js');
    
    const port = process.env.PORT || 5000;
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`Production server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start production server:', error);
    process.exit(1);
  }
}

startProductionServer();