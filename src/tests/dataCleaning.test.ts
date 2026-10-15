import { describe, it, expect } from 'vitest';
import {
  DataCleaningService,
  normalizeHeader,
  parseDateString,
  REQUIRED_CANONICAL_COLUMNS,
} from '../services/dataCleaningService';
import { RawCSVRecord } from '../types';

describe('Data Cleaning & CSV Normalization Pipeline', () => {
  it('normalizes recognized header synonyms to canonical names', () => {
    expect(normalizeHeader('Date')).toBe('date');
    expect(normalizeHeader('DATE')).toBe('date');
    expect(normalizeHeader('Store ID')).toBe('store_id');
    expect(normalizeHeader('storeid')).toBe('store_id');
    expect(normalizeHeader('Product ID')).toBe('product_id');
    expect(normalizeHeader('productid')).toBe('product_id');
    expect(normalizeHeader('Units Sold')).toBe('units_sold');
    expect(normalizeHeader('Sales')).toBe('units_sold');
    expect(normalizeHeader('Closing Stock')).toBe('recorded_closing_stock');
    expect(normalizeHeader('Recorded Stock')).toBe('recorded_closing_stock');
    expect(normalizeHeader('Price')).toBe('selling_price');
    expect(normalizeHeader('MRP')).toBe('selling_price');
  });

  it('validates and parses different date formats to YYYY-MM-DD', () => {
    expect(parseDateString('2026-10-14')).toBe('2026-10-14');
    expect(parseDateString('14-10-2026')).toBe('2026-10-14');
    expect(parseDateString('14/10/2026')).toBe('2026-10-14');
    expect(parseDateString('invalid-date')).toBeNull();
    expect(parseDateString('')).toBeNull();
  });

  it('rejects datasets missing required canonical columns', () => {
    // Missing store_id and recorded_closing_stock
    const incompleteRawRows: RawCSVRecord[] = [
      {
        date: '2026-10-14',
        product_id: 'PRD_001',
        units_sold: '5',
      },
    ];

    const result = DataCleaningService.cleanDataset(incompleteRawRows, 'Test Store');
    const hasRequiredColError = result.errors.some((e) =>
      e.errorMessage.includes('Missing required column(s)')
    );
    expect(hasRequiredColError).toBe(true);
  });

  it('rejects negative quantities and flags invalid numeric fields', () => {
    const rawWithNegative: RawCSVRecord[] = [
      {
        date: '2026-10-14',
        store_id: 'STR_001',
        product_id: 'PRD_001',
        units_sold: '-5',
        recorded_closing_stock: '10',
      },
      {
        date: '2026-10-14',
        store_id: 'STR_001',
        product_id: 'PRD_002',
        units_sold: 'abc',
        recorded_closing_stock: '10',
      },
    ];

    const result = DataCleaningService.cleanDataset(rawWithNegative, 'Test Store');
    expect(result.cleanedRecords.length).toBe(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some((e) => e.errorMessage.includes('Negative units_sold'))).toBe(true);
  });

  it('filters exact duplicate rows', () => {
    const duplicateRows: RawCSVRecord[] = [
      {
        date: '2026-10-14',
        store_id: 'STR_001',
        product_id: 'PRD_101',
        units_sold: '8',
        recorded_closing_stock: '20',
      },
      {
        date: '2026-10-14',
        store_id: 'STR_001',
        product_id: 'PRD_101',
        units_sold: '8',
        recorded_closing_stock: '20',
      },
    ];

    const result = DataCleaningService.cleanDataset(duplicateRows, 'Test Mart');
    expect(result.report.duplicateRecordsIdentified).toBe(1);
    expect(result.cleanedRecords.length).toBe(1);
  });

  it('detects potential duplicate keys using date + store_id + product_id and keeps latest', () => {
    const potentialDuplicates: RawCSVRecord[] = [
      {
        date: '2026-10-14',
        store_id: 'STR_001',
        product_id: 'PRD_101',
        units_sold: '4',
        recorded_closing_stock: '25',
      },
      {
        date: '2026-10-14',
        store_id: 'STR_001',
        product_id: 'PRD_101',
        units_sold: '9', // updated latest count
        recorded_closing_stock: '20',
      },
    ];

    const result = DataCleaningService.cleanDataset(potentialDuplicates, 'Test Mart');
    expect(result.report.duplicateRecordsIdentified).toBe(1);
    expect(result.cleanedRecords.length).toBe(1);
    expect(result.cleanedRecords[0].units_sold).toBe(9);
  });

  it('calculates data quality percentage accurately', () => {
    const mixedRows: RawCSVRecord[] = [
      // Valid row
      {
        date: '2026-10-14',
        store_id: 'STR_001',
        product_id: 'PRD_001',
        units_sold: '5',
        recorded_closing_stock: '15',
      },
      // Invalid row (bad date)
      {
        date: 'invalid',
        store_id: 'STR_001',
        product_id: 'PRD_002',
        units_sold: '5',
        recorded_closing_stock: '15',
      },
    ];

    const result = DataCleaningService.cleanDataset(mixedRows, 'Test Mart');
    // 1 valid out of 2 total rows => 50%
    expect(result.report.dataQualityPercentage).toBe(50.0);
    expect(result.report.requiresReview).toBe(true);
  });
});
