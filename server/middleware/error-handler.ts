import { Request, Response, NextFunction } from 'express';
import { logError } from '../services/logger';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Define API error class
export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, any>;

  constructor(message: string, status = 500, code = 'server_error', details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Common API errors
export const ApiErrors = {
  // 400 errors
  badRequest: (message = 'Bad request', details?: Record<string, any>) => 
    new ApiError(message, 400, 'bad_request', details),
  
  validationError: (message = 'Validation error', details?: Record<string, any>) => 
    new ApiError(message, 400, 'validation_error', details),
  
  // 401 errors
  unauthorized: (message = 'Unauthorized', details?: Record<string, any>) => 
    new ApiError(message, 401, 'unauthorized', details),
  
  // 403 errors
  forbidden: (message = 'Forbidden', details?: Record<string, any>) => 
    new ApiError(message, 403, 'forbidden', details),
  
  // 404 errors
  notFound: (message = 'Resource not found', details?: Record<string, any>) => 
    new ApiError(message, 404, 'not_found', details),
  
  // 409 errors
  conflict: (message = 'Resource conflict', details?: Record<string, any>) => 
    new ApiError(message, 409, 'conflict', details),
  
  // 500 errors
  internal: (message = 'Internal server error', details?: Record<string, any>) => 
    new ApiError(message, 500, 'internal_error', details),
  
  // Services errors
  database: (message = 'Database error', details?: Record<string, any>) => 
    new ApiError(message, 500, 'database_error', details),
  
  payment: (message = 'Payment processing error', details?: Record<string, any>) => 
    new ApiError(message, 500, 'payment_error', details),
  
  email: (message = 'Email sending error', details?: Record<string, any>) => 
    new ApiError(message, 500, 'email_error', details)
};

// API error handler middleware
export function apiErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log error
  logError(err, req).catch(logErr => console.error('Error logging error:', logErr));
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json({
      message: 'Validation error',
      code: 'validation_error',
      errors: validationError.details,
      status: 400
    });
  }
  
  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      message: err.message,
      code: err.code,
      details: err.details,
      status: err.status
    });
  }
  
  // Handle unknown errors
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(status).json({
    message,
    code: 'internal_error',
    status,
    ...(isProduction ? {} : {
      stack: err.stack,
      details: err.details || {}
    })
  });
}