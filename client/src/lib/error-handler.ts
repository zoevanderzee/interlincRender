import { ApiError } from "./queryClient";
import { toast } from "@/hooks/use-toast";

// Error type mapping 
type ErrorType = 
  | 'auth' 
  | 'validation' 
  | 'network' 
  | 'server' 
  | 'payment' 
  | 'rate_limit'
  | 'unknown';

// Map HTTP status codes to error types
function getErrorType(error: ApiError): ErrorType {
  const { status } = error;
  
  // Authentication errors
  if (status === 401 || status === 403) {
    return 'auth';
  }
  
  // Validation errors
  if (status === 400 || status === 422) {
    return 'validation';
  }
  
  // Network errors
  if (status === 0 || status === 504) {
    return 'network';
  }
  
  // Rate limiting
  if (status === 429) {
    return 'rate_limit';
  }
  
  // Payment errors
  if (status === 402) {
    return 'payment';
  }
  
  // Server errors
  if (status >= 500) {
    return 'server';
  }
  
  return 'unknown';
}

// Get user-friendly message based on error type
function getUserFriendlyMessage(error: ApiError): string {
  const errorType = getErrorType(error);
  
  switch (errorType) {
    case 'auth':
      return 'You need to be signed in to access this feature.';
    
    case 'validation':
      return 'Please check your input and try again.';
    
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection.';
    
    case 'rate_limit':
      return 'Too many requests. Please try again later.';
    
    case 'payment':
      return 'There was an issue processing your payment.';
    
    case 'server':
      return 'Our system is experiencing issues. Please try again later.';
    
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Main error handler function
export function handleApiError(error: unknown): void {
  // If not an API error, convert to generic error
  const apiError = error instanceof Error && (error as ApiError).isApiError 
    ? error as ApiError 
    : new Error('An unexpected error occurred') as ApiError;
  
  // Get appropriate error message
  const message = apiError.message || getUserFriendlyMessage(apiError);
  
  // Log detailed error for debugging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.error('API Error:', apiError);
  }
  
  // Show user-friendly toast notification
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
}

// Helper function for mutation error handling
export function handleMutationError(error: unknown, customMessage?: string): void {
  if (customMessage) {
    toast({
      title: 'Error',
      description: customMessage,
      variant: 'destructive',
    });
    return;
  }
  
  handleApiError(error);
}