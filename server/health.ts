
import { Express } from 'express';

export function setupHealthCheck(app: Express) {
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'api_ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      auth: 'enabled'
    });
  });
}
