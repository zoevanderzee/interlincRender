
/**
 * Centralized currency formatting utilities
 * Handles multi-currency display across the application
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
};

/**
 * Get the symbol for a currency code
 */
export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] || code;
}

/**
 * Format an amount with currency symbol
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code (e.g., 'GBP', 'USD', 'EUR')
 * @param options - Additional formatting options
 */
export function formatCurrency(
  amount: number | string,
  currency: string = 'GBP',
  options?: Intl.NumberFormatOptions
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return `${currencySymbol(currency)}0.00`;
  }

  // Use Intl.NumberFormat for proper locale-aware formatting
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });

  return formatter.format(numericAmount);
}

/**
 * Format currency without the symbol (just the number)
 */
export function formatCurrencyAmount(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '0.00';
  }

  return numericAmount.toFixed(2);
}
