/**
 * Currencies a trip budget can be denominated in. Mirrors the authoritative
 * list in `server/src/utils/currencies.js` — keep the two in sync when adding
 * one, or the server will reject the new option.
 */
export const CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'ILS', name: 'Israeli Shekel' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'NPR', name: 'Nepalese Rupee' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'ZAR', name: 'South African Rand' },
];

export const DEFAULT_CURRENCY = 'USD';

const SUPPORTED = new Set(CURRENCIES.map((currency) => currency.code));

export const isSupportedCurrency = (code) => SUPPORTED.has(String(code || '').toUpperCase());

/** Region → currency for the locales this app is most likely to be opened in. */
const REGION_CURRENCY = {
  AE: 'AED',
  AT: 'EUR',
  AU: 'AUD',
  BD: 'BDT',
  BE: 'EUR',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  CN: 'CNY',
  CZ: 'CZK',
  DE: 'EUR',
  DK: 'DKK',
  EG: 'EGP',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  GR: 'EUR',
  HK: 'HKD',
  ID: 'IDR',
  IE: 'EUR',
  IL: 'ILS',
  IN: 'INR',
  IT: 'EUR',
  JP: 'JPY',
  KE: 'KES',
  KR: 'KRW',
  LK: 'LKR',
  MX: 'MXN',
  MY: 'MYR',
  NG: 'NGN',
  NL: 'EUR',
  NO: 'NOK',
  NP: 'NPR',
  NZ: 'NZD',
  PH: 'PHP',
  PK: 'PKR',
  PL: 'PLN',
  PT: 'EUR',
  QA: 'QAR',
  SA: 'SAR',
  SE: 'SEK',
  SG: 'SGD',
  TH: 'THB',
  TR: 'TRY',
  TW: 'TWD',
  US: 'USD',
  VN: 'VND',
  ZA: 'ZAR',
};

/**
 * Best guess at the currency this user thinks in, from their browser locale, so
 * a new trip does not default to dollars for someone budgeting in rupees. They
 * can always override it in the picker.
 */
export function guessCurrency() {
  try {
    const locale = navigator.languages?.[0] || navigator.language;
    if (!locale) return DEFAULT_CURRENCY;

    const region = new Intl.Locale(locale).maximize().region;
    const guess = REGION_CURRENCY[region];
    return guess && SUPPORTED.has(guess) ? guess : DEFAULT_CURRENCY;
  } catch {
    // Intl.Locale is missing or the locale string is malformed.
    return DEFAULT_CURRENCY;
  }
}

/** The narrow symbol for a currency ("₹", "$"), falling back to its code. */
export function currencySymbol(code) {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).formatToParts(0);

    return parts.find((part) => part.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

/** "INR — Indian Rupee (₹)" for the picker. */
export function currencyLabel({ code, name }) {
  const symbol = currencySymbol(code);
  return symbol && symbol !== code ? `${code} — ${name} (${symbol})` : `${code} — ${name}`;
}
