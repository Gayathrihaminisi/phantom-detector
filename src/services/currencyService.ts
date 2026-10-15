import { formatINR, formatCompactINR, calculateRevenue } from '../utils/currencyFormatter';

export const currencyService = {
  format(amount: number | null | undefined, fallback?: string): string {
    return formatINR(amount, fallback);
  },

  formatCompact(amount: number | null | undefined, fallback?: string): string {
    return formatCompactINR(amount, fallback);
  },

  computeRevenue(unitsSold: number, sellingPrice: number | null | undefined): number | null {
    return calculateRevenue(unitsSold, sellingPrice);
  },

  getCurrencyCode(): string {
    return 'INR';
  },

  getCurrencySymbol(): string {
    return '₹';
  }
};
