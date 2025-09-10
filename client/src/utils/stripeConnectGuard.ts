/**
 * Stripe Connect Guard - Ensures embedded-only implementation
 * 
 * This guard script validates that the application uses only embedded onboarding
 * and prevents any fallback to Standard account links or accountLinks.create.
 * 
 * Design Requirements:
 * - Express accounts only (no Standard accounts)
 * - accountSessions.create only (no accountLinks.create)
 * - Embedded onboarding rendering inside container div
 * - No external redirects or popup windows
 */

// Type definitions for validation
interface ConnectConfig {
  accountType: 'express' | 'standard' | 'custom';
  onboardingMethod: 'embedded' | 'hosted' | 'link';
  sessionType: 'accountSession' | 'accountLink';
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Guard class for Stripe Connect implementation validation
export class StripeConnectGuard {
  private static instance: StripeConnectGuard;
  private config: ConnectConfig;

  private constructor() {
    this.config = {
      accountType: 'express',
      onboardingMethod: 'embedded',
      sessionType: 'accountSession'
    };
  }

  public static getInstance(): StripeConnectGuard {
    if (!StripeConnectGuard.instance) {
      StripeConnectGuard.instance = new StripeConnectGuard();
    }
    return StripeConnectGuard.instance;
  }

  /**
   * Validates account creation request to ensure Express accounts only
   */
  public validateAccountCreation(accountParams: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Ensure Express account type
    if (accountParams.type !== 'express') {
      result.isValid = false;
      result.errors.push(`Invalid account type: ${accountParams.type}. Only 'express' accounts are allowed.`);
    }

    // Check for Standard account indicators
    if (accountParams.type === 'standard') {
      result.isValid = false;
      result.errors.push('Standard accounts are not supported in embedded implementation.');
    }

    // Validate required capabilities
    const requiredCapabilities = ['card_payments', 'transfers'];
    const providedCapabilities = Object.keys(accountParams.capabilities || {});
    
    for (const capability of requiredCapabilities) {
      if (!providedCapabilities.includes(capability)) {
        result.warnings.push(`Missing recommended capability: ${capability}`);
      }
    }

    return result;
  }

  /**
   * Validates session creation to ensure accountSessions.create is used
   */
  public validateSessionCreation(sessionParams: any, methodUsed: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Ensure accountSessions.create is used, not accountLinks.create
    if (methodUsed !== 'accountSessions.create') {
      result.isValid = false;
      result.errors.push(`Invalid session method: ${methodUsed}. Only 'accountSessions.create' is allowed for embedded onboarding.`);
    }

    // Check for accountLinks indicators
    if (methodUsed === 'accountLinks.create' || sessionParams.return_url || sessionParams.refresh_url) {
      result.isValid = false;
      result.errors.push('Account links (accountLinks.create) are not supported. Use accountSessions.create for embedded onboarding.');
    }

    // Validate embedded components are enabled
    const components = sessionParams.components || {};
    if (!components.account_onboarding?.enabled) {
      result.warnings.push('account_onboarding component should be enabled for embedded onboarding.');
    }

    return result;
  }

  /**
   * Validates frontend implementation to ensure embedded rendering
   */
  public validateFrontendImplementation(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for container element
    const containerElement = document.getElementById('connect-onboarding');
    if (!containerElement) {
      result.warnings.push('Container element #connect-onboarding not found. Ensure embedded components render inside a container div.');
    }

    // Check for external redirect patterns (these should not exist)
    const suspiciousPatterns = [
      'window.open(',
      'window.location.href =',
      'location.href =',
      '.redirect(',
      'connect.accountLinks.create'
    ];

    const scriptElements = document.getElementsByTagName('script');
    for (const script of Array.from(scriptElements)) {
      const scriptContent = script.innerHTML;
      for (const pattern of suspiciousPatterns) {
        if (scriptContent.includes(pattern)) {
          result.warnings.push(`Suspicious pattern detected: ${pattern}. Ensure no external redirects are used.`);
        }
      }
    }

    return result;
  }

  /**
   * Validates API responses to ensure proper account types
   */
  public validateApiResponse(response: any, endpoint: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (endpoint.includes('/ensure-account')) {
      // Validate account creation response
      if (response.accountType !== 'express') {
        result.isValid = false;
        result.errors.push(`API returned non-Express account: ${response.accountType}`);
      }
    }

    if (endpoint.includes('/session')) {
      // Validate session creation response
      if (!response.client_secret) {
        result.isValid = false;
        result.errors.push('Session response missing client_secret (required for embedded onboarding)');
      }

      if (response.url) {
        result.errors.push('Session response contains URL field (indicates hosted onboarding, not embedded)');
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Comprehensive validation method
   */
  public validateImplementation(): ValidationResult {
    const frontendValidation = this.validateFrontendImplementation();
    
    return {
      isValid: frontendValidation.isValid,
      errors: frontendValidation.errors,
      warnings: [
        ...frontendValidation.warnings,
        'Guard validation complete. Check console for detailed results.'
      ]
    };
  }

  /**
   * Log validation results to console with proper formatting
   */
  public logValidationResult(result: ValidationResult, context: string): void {
    console.group(`🔒 Stripe Connect Guard - ${context}`);
    
    if (result.isValid) {
      console.log('✅ Validation passed');
    } else {
      console.error('❌ Validation failed');
    }

    if (result.errors.length > 0) {
      console.group('❌ Errors:');
      result.errors.forEach(error => console.error(error));
      console.groupEnd();
    }

    if (result.warnings.length > 0) {
      console.group('⚠️ Warnings:');
      result.warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }

    console.groupEnd();
  }
}

// Utility functions for easy access
export const validateAccountCreation = (accountParams: any) => {
  const guard = StripeConnectGuard.getInstance();
  const result = guard.validateAccountCreation(accountParams);
  guard.logValidationResult(result, 'Account Creation');
  return result;
};

export const validateSessionCreation = (sessionParams: any, methodUsed: string) => {
  const guard = StripeConnectGuard.getInstance();
  const result = guard.validateSessionCreation(sessionParams, methodUsed);
  guard.logValidationResult(result, 'Session Creation');
  return result;
};

export const validateApiResponse = (response: any, endpoint: string) => {
  const guard = StripeConnectGuard.getInstance();
  const result = guard.validateApiResponse(response, endpoint);
  guard.logValidationResult(result, `API Response: ${endpoint}`);
  return result;
};

export const validateImplementation = () => {
  const guard = StripeConnectGuard.getInstance();
  const result = guard.validateImplementation();
  guard.logValidationResult(result, 'Implementation Check');
  return result;
};

// Export default instance
export default StripeConnectGuard;