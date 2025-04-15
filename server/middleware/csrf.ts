import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * Simple CSRF protection middleware
 * This creates a CSRF token for forms and validates it on POST, PUT, DELETE requests
 */

// Store for CSRF tokens - in production use Redis or a database
const csrfTokens: Record<string, { expires: Date }> = {};

// Clean up expired tokens periodically (every 15 minutes)
setInterval(() => {
  const now = new Date();
  for (const token in csrfTokens) {
    if (csrfTokens[token].expires < now) {
      delete csrfTokens[token];
    }
  }
}, 15 * 60 * 1000);

// Generate a new CSRF token
export function generateCsrfToken(req: Request): string {
  // Generate a random token
  const token = randomBytes(32).toString('hex');
  
  // Set expiration (24 hours)
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  
  // Store the token
  csrfTokens[token] = { expires };
  
  return token;
}

// CSRF protection middleware
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // For API requests, check the CSRF token in the header
  const csrfToken = req.headers['x-csrf-token'] as string;
  
  // For form submissions, check the CSRF token in the body
  const formCsrfToken = req.body?._csrf;
  
  const token = csrfToken || formCsrfToken;
  
  if (!token || !csrfTokens[token]) {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token'
    });
  }
  
  // Token is valid, so remove it to prevent reuse
  delete csrfTokens[token];
  
  // Continue with the request
  next();
}

// Middleware to add CSRF token to templates
export function addCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Generate a token
  const token = generateCsrfToken(req);
  
  // Add it to res.locals for templates
  res.locals.csrfToken = token;
  
  // Add it as a response header for API clients
  res.setHeader('X-CSRF-Token', token);
  
  next();
}