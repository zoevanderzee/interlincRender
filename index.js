import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Import and register all API routes first
import('./dist/index.js').then(({ registerRoutes }) => {
  registerRoutes(app);
  
  // Serve static files AFTER API routes are registered
  const distPath = path.resolve(__dirname, "dist", "public");
  app.use(express.static(distPath));
  
  // Catch-all handler for frontend routing (must be last)
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
  
  const port = process.env.PORT || 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});