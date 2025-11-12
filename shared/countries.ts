// Stripe-supported countries with their currencies
// Based on Stripe's supported countries: https://stripe.com/global

export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2 code
  name: string;
  currency: string; // ISO 4217 currency code
}

export const STRIPE_COUNTRIES: Record<string, CountryInfo> = {
  GB: { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  US: { code: 'US', name: 'United States', currency: 'USD' },
  CA: { code: 'CA', name: 'Canada', currency: 'CAD' },
  AU: { code: 'AU', name: 'Australia', currency: 'AUD' },
  NZ: { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  IE: { code: 'IE', name: 'Ireland', currency: 'EUR' },
  DE: { code: 'DE', name: 'Germany', currency: 'EUR' },
  FR: { code: 'FR', name: 'France', currency: 'EUR' },
  IT: { code: 'IT', name: 'Italy', currency: 'EUR' },
  ES: { code: 'ES', name: 'Spain', currency: 'EUR' },
  NL: { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  BE: { code: 'BE', name: 'Belgium', currency: 'EUR' },
  AT: { code: 'AT', name: 'Austria', currency: 'EUR' },
  PT: { code: 'PT', name: 'Portugal', currency: 'EUR' },
  FI: { code: 'FI', name: 'Finland', currency: 'EUR' },
  GR: { code: 'GR', name: 'Greece', currency: 'EUR' },
  LU: { code: 'LU', name: 'Luxembourg', currency: 'EUR' },
  SE: { code: 'SE', name: 'Sweden', currency: 'SEK' },
  DK: { code: 'DK', name: 'Denmark', currency: 'DKK' },
  NO: { code: 'NO', name: 'Norway', currency: 'NOK' },
  CH: { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  PL: { code: 'PL', name: 'Poland', currency: 'PLN' },
  CZ: { code: 'CZ', name: 'Czech Republic', currency: 'CZK' },
  HU: { code: 'HU', name: 'Hungary', currency: 'HUF' },
  RO: { code: 'RO', name: 'Romania', currency: 'RON' },
  BG: { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
  JP: { code: 'JP', name: 'Japan', currency: 'JPY' },
  SG: { code: 'SG', name: 'Singapore', currency: 'SGD' },
  HK: { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  MY: { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  TH: { code: 'TH', name: 'Thailand', currency: 'THB' },
  IN: { code: 'IN', name: 'India', currency: 'INR' },
  ID: { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  PH: { code: 'PH', name: 'Philippines', currency: 'PHP' },
  MX: { code: 'MX', name: 'Mexico', currency: 'MXN' },
  BR: { code: 'BR', name: 'Brazil', currency: 'BRL' },
  AE: { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  SA: { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  ZA: { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
};

export const SUPPORTED_COUNTRIES = Object.values(STRIPE_COUNTRIES).sort((a, b) => 
  a.name.localeCompare(b.name)
);

export const SUPPORTED_CURRENCIES = Array.from(
  new Set(Object.values(STRIPE_COUNTRIES).map(c => c.currency))
).sort();

export function getCountryInfo(countryCode: string): CountryInfo | undefined {
  return STRIPE_COUNTRIES[countryCode];
}

export function getCurrencyForCountry(countryCode: string): string {
  return STRIPE_COUNTRIES[countryCode]?.currency || 'GBP';
}

export function getCountriesForCurrency(currency: string): CountryInfo[] {
  return Object.values(STRIPE_COUNTRIES).filter(c => c.currency === currency);
}
