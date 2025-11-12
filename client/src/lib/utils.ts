import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency: string = 'GBP'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(0);
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

// Helper for displaying amounts across multiple currencies
export function formatMultiCurrencyTotal(amounts: Array<{amount: number | string, currency: string}>): string {
  if (amounts.length === 0) return '£0.00';
  
  // Group by currency
  const byCurrency = amounts.reduce((acc, item) => {
    const num = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;
    if (isNaN(num)) return acc;
    
    const curr = item.currency || 'GBP';
    acc[curr] = (acc[curr] || 0) + num;
    return acc;
  }, {} as Record<string, number>);
  
  // If single currency, format normally
  const currencies = Object.keys(byCurrency);
  if (currencies.length === 1) {
    return formatCurrency(byCurrency[currencies[0]], currencies[0]);
  }
  
  // Multiple currencies - show as list
  return currencies.map(curr => formatCurrency(byCurrency[curr], curr)).join(' + ');
}
