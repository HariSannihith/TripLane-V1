'use strict';

/**
 * Currencies a trip budget can be denominated in.
 *
 * This list is the server-side authority: a group may only be created or
 * updated with a code that appears here, so the database can never hold a
 * typo like "USDD" or a made-up code that `Intl.NumberFormat` would happily
 * render as raw text. `client/src/utils/currencies.js` mirrors these codes
 * with display names for the picker.
 */
const SUPPORTED_CURRENCY_CODES = [
  'AED',
  'AUD',
  'BDT',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EGP',
  'EUR',
  'GBP',
  'HKD',
  'IDR',
  'ILS',
  'INR',
  'JPY',
  'KES',
  'KRW',
  'LKR',
  'MXN',
  'MYR',
  'NGN',
  'NOK',
  'NPR',
  'NZD',
  'PHP',
  'PKR',
  'PLN',
  'QAR',
  'SAR',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'TWD',
  'USD',
  'VND',
  'ZAR',
];

const DEFAULT_CURRENCY = 'USD';

const CURRENCY_SET = new Set(SUPPORTED_CURRENCY_CODES);

function normalizeCurrency(value) {
  return String(value || '').trim().toUpperCase();
}

function isSupportedCurrency(value) {
  return CURRENCY_SET.has(normalizeCurrency(value));
}

module.exports = {
  SUPPORTED_CURRENCY_CODES,
  DEFAULT_CURRENCY,
  normalizeCurrency,
  isSupportedCurrency,
};
