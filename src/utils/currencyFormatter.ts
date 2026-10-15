// Currency Formatting Utilities for Indian Rupee (INR)

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Format a number into Indian Rupee currency string (e.g., ₹1,25,000.00)
 * If value is null, undefined, or NaN, returns fallback text or "Unavailable"
 */
export function formatINR(
  amount: number | null | undefined,
  fallbackText: string = 'Unavailable'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return fallbackText;
  }
  return inrFormatter.format(amount);
}

/**
 * Format compact INR for charts or badges (e.g. ₹12.5K, ₹1.5L, ₹1.2Cr)
 */
export function formatCompactINR(
  amount: number | null | undefined,
  fallbackText: string = '₹0'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return fallbackText;
  }
  return inrCompactFormatter.format(amount);
}

/**
 * Calculate recorded revenue: Units Sold * Selling Price
 * Returns null if selling price is unavailable
 */
export function calculateRevenue(
  unitsSold: number,
  sellingPrice: number | null | undefined
): number | null {
  if (sellingPrice === null || sellingPrice === undefined || isNaN(sellingPrice)) {
    return null;
  }
  return Math.max(0, unitsSold * sellingPrice);
}
