import { z } from 'zod';

// Form validation error message constants
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Cannot exceed ${max} characters`,
  numberMin: (min: number) => `Must be at least ${min}`,
  numberMax: (max: number) => `Cannot exceed ${max}`,
  passwordMatch: 'Passwords must match',
  invalidDate: 'Please enter a valid date',
  pastDate: 'Date cannot be in the past',
  futureDate: 'Date cannot be in the future',
  phoneNumber: 'Please enter a valid phone number',
  invalidNumber: 'Please enter a valid number',
  positiveNumber: 'Value must be positive',
  integerNumber: 'Value must be a whole number'
};

// Common validation schemas
export const commonValidators = {
  // Basic validations
  nonEmptyString: z.string().trim().min(1, { message: VALIDATION_MESSAGES.required }),
  
  email: z.string().email({ message: VALIDATION_MESSAGES.email }),
  
  url: z.string().url({ message: VALIDATION_MESSAGES.url }),
  
  // Number validations
  positiveNumber: z.number().positive({ message: VALIDATION_MESSAGES.positiveNumber }),
  
  nonNegativeNumber: z.number().nonnegative(),
  
  integerNumber: z.number().int({ message: VALIDATION_MESSAGES.integerNumber }),
  
  // Custom validations
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, { message: VALIDATION_MESSAGES.phoneNumber }),
  
  password: z.string()
    .min(8, { message: VALIDATION_MESSAGES.minLength(8) })
    .regex(/[A-Z]/, { message: 'Must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Must contain at least one number' }),
  
  confirmPassword: (passwordField: string) => z.object({
    [passwordField]: z.string(),
    confirmPassword: z.string()
  }).refine(data => data[passwordField] === data.confirmPassword, {
    message: VALIDATION_MESSAGES.passwordMatch,
    path: ['confirmPassword']
  }),
  
  // Date validations
  pastDate: z.date().refine(date => date < new Date(), { 
    message: VALIDATION_MESSAGES.pastDate 
  }),
  
  futureDate: z.date().refine(date => date > new Date(), { 
    message: VALIDATION_MESSAGES.futureDate 
  }),
  
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date()
  }).refine(data => data.startDate < data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate']
  })
};

// Helper to create form validation
export function createFormValidation<T extends z.ZodType>(schema: T) {
  return (data: unknown) => {
    try {
      return { data: schema.parse(data), success: true, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.reduce((acc, curr) => {
          const key = curr.path.join('.');
          acc[key] = curr.message;
          return acc;
        }, {} as Record<string, string>);
        
        return { data: null, success: false, errors: formattedErrors };
      }
      throw error;
    }
  };
}