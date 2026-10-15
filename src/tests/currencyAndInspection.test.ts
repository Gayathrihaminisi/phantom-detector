import { describe, it, expect, beforeEach } from 'vitest';
import { formatINR, formatCompactINR, calculateRevenue } from '../utils/currencyFormatter';
import { InspectionService } from '../services/inspectionService';
import { AuthService } from '../services/authService';

describe('Indian Currency Formatting (INR) & Financial Calculation', () => {
  it('formats amounts into standard Indian Rupee notation (₹)', () => {
    const formatted = formatINR(1250);
    expect(formatted).toContain('₹');
    expect(formatted).toContain('1,250.00');

    const formattedLakh = formatINR(125000);
    expect(formattedLakh).toContain('1,25,000.00');
  });

  it('handles null, undefined, and NaN by displaying fallback text', () => {
    expect(formatINR(null)).toBe('Unavailable');
    expect(formatINR(undefined)).toBe('Unavailable');
    expect(formatINR(NaN)).toBe('Unavailable');
    expect(formatINR(null, 'N/A')).toBe('N/A');
  });

  it('calculates recorded revenue correctly without fabricating missing prices', () => {
    expect(calculateRevenue(10, 150.0)).toBe(1500.0);
    expect(calculateRevenue(10, null)).toBeNull();
    expect(calculateRevenue(10, undefined)).toBeNull();
  });
});

describe('Physical Shelf Inspection Workflow & Verified Discrepancy Loss', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calculates confirmed financial loss only when shelf discrepancy is verified', () => {
    const service = InspectionService.getInstance();

    // Case 1: Verified shortage: Book = 12, Actual counted = 0, Price = ₹150
    const verifiedShortage = service.recordInspection({
      productId: 'PRD_101',
      productName: 'Chocolate Biscuits',
      storeId: 'STR_001',
      recordedQuantity: 12,
      actualShelfQuantity: 0,
      shelfAvailability: 'unavailable',
      discrepancyType: 'phantom_stockout_verified',
      notes: 'Shelf was completely empty',
      inspectorName: 'Auditor A',
      sellingPrice: 150.0,
    });

    expect(verifiedShortage.verified_discrepancy).toBe(true);
    // Loss = 12 * 150 = ₹1,800.00
    expect(verifiedShortage.confirmed_financial_loss).toBe(1800.0);

    // Case 2: False alarm / stock is present: Book = 12, Actual counted = 12
    const falseAlarm = service.recordInspection({
      productId: 'PRD_102',
      productName: 'Tata Salt',
      storeId: 'STR_001',
      recordedQuantity: 12,
      actualShelfQuantity: 12,
      shelfAvailability: 'available',
      discrepancyType: 'none_stock_present',
      notes: 'Stock found on shelf display',
      inspectorName: 'Auditor A',
      sellingPrice: 28.0,
    });

    expect(falseAlarm.verified_discrepancy).toBe(false);
    expect(falseAlarm.confirmed_financial_loss).toBeNull();
  });
});

describe('Manager Registration & Supermarket Profile Validation', () => {
  it('registers manager profile with supermarket name requirement', () => {
    const auth = AuthService.getInstance();
    const profile = auth.register({
      fullName: 'Anita Deshmukh',
      email: 'anita@morestores.com',
      supermarketName: 'More Supermarket',
      supermarketLocation: 'Indiranagar, Bengaluru',
      contactNumber: '+91 98450 99999',
    });

    expect(profile.supermarketName).toBe('More Supermarket');
    expect(profile.fullName).toBe('Anita Deshmukh');
    expect(profile.email).toBe('anita@morestores.com');

    const state = auth.getInitialState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.manager?.supermarketName).toBe('More Supermarket');
  });
});
