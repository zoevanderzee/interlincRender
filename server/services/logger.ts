import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Promisify fs.appendFile
const appendFile = promisify(fs.appendFile);
const mkdir = promisify(fs.mkdir);

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
const errorLogPath = path.join(logsDir, 'error.log');
const accessLogPath = path.join(logsDir, 'access.log');

// Create logs directory if it doesn't exist
async function ensureLogsDirectory() {
  try {
    if (!fs.existsSync(logsDir)) {
      await mkdir(logsDir, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

// Initialize the logger
export async function initializeLogger() {
  await ensureLogsDirectory();
  console.log('Logger initialized');
}

// Log error to file
export async function logError(error: Error, req?: Request) {
  try {
    const timestamp = new Date().toISOString();
    const method = req?.method || 'N/A';
    const url = req?.originalUrl || 'N/A';
    const userAgent = req?.headers['user-agent'] || 'N/A';
    const ip = req?.ip || 'N/A';
    const userId = (req as any)?.user?.id || 'not authenticated';

    const logEntry = JSON.stringify({
      timestamp,
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      request: {
        method,
        url,
        userAgent,
        ip,
        userId
      }
    }, null, 2);

    await appendFile(errorLogPath, `${logEntry}\n`, 'utf8');
    
    // Also log to console in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ERROR] ${timestamp} - ${error.message}`);
    }
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError);
  }
}

// Log request to file (useful for access logs)
export async function logRequest(req: Request, res: Response, responseTime?: number) {
  try {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;
    const userAgent = req.headers['user-agent'] || 'N/A';
    const ip = req.ip || 'N/A';
    const userId = (req as any).user?.id || 'not authenticated';

    const logEntry = JSON.stringify({
      timestamp,
      level: 'INFO',
      message: `${method} ${url} ${status}`,
      request: {
        method,
        url,
        status,
        responseTime: responseTime ? `${responseTime}ms` : 'N/A',
        userAgent,
        ip,
        userId
      }
    }, null, 2);

    await appendFile(accessLogPath, `${logEntry}\n`, 'utf8');
    
    // Skip console logging for access logs to avoid cluttering the console
  } catch (loggingError) {
    console.error('Failed to log request:', loggingError);
  }
}

// Create a middleware to log all requests
export function requestLogger(req: Request, res: Response, next: Function) {
  const start = Date.now();
  
  // Log request on completion
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logRequest(req, res, responseTime).catch(err => console.error('Request logging error:', err));
  });
  
  next();
}

// Create a middleware to handle errors
export function errorLogger(err: Error, req: Request, res: Response, next: Function) {
  logError(err, req).catch(loggingErr => console.error('Error logging error:', loggingErr));
  next(err);
}