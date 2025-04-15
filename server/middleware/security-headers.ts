import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add security headers to all responses
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Helps prevent XSS attacks by restricting browser features that could be exploited
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevents the browser from MIME-sniffing a response away from the declared content-type
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevents clickjacking by preventing the page from being framed
  res.setHeader('X-Frame-Options', 'DENY');
  
  // HTTP Strict Transport Security - forces HTTPS usage once enabled
  // Only enable in production since it can cause issues in development
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  // Temporarily disable CSP for debugging purposes
  /*
  const cspDirectives = [
    "default-src 'self'",
    "img-src 'self' data: https: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com", // Allow Stripe.js
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: https://api.stripe.com", // Allow Stripe API connections
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com", // Allow Stripe frames
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];
  
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  */
  
  // Referrer Policy - controls how much referrer information is sent
  res.setHeader('Referrer-Policy', 'same-origin');
  
  // Feature Policy - limits which browser features can be used
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
}