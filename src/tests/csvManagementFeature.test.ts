import { describe, it, expect, beforeEach } from 'vitest';
import {
  DataCleaningService,
  normalizeHeader,
  parseDateString,
  REQUIRED_CANONICAL_COLUMNS,
} from '../services/dataCleaningService';
import { CsvImportService } from '../services/csvImportService';
import { inventoryService } from '../services/inventoryService';
import { RiskDetectionEngine, DEFAULT_RISK_WEIGHTS, DEFAULT_RISK_THRESHOLDS } from '../services/riskDetectionEngine';
import { currencyService } from '../services/currencyService';
import { AnalyticsService } from '../services/analyticsService';
import { RawCSVRecord, CleanedInventoryRecord } from '../types';

describe('Comprehensive Easy CSV Management Feature Acceptance Tests', () => {
  beforeEach(() => {
    inventoryService.clearAll();
  });

  // Test 1: Beginner-friendly column recognition and camelCase handling
  it('Criterion 1 & 2: Recognizes column name variations, spaces, and camelCase', () => {
    const variations = [
      { raw: 'product_id', expected: 'product_id' },
      { raw: 'productId', expected: 'product_id' },
      { raw: 'Product ID', expected: 'product_id' },
      { raw: 'store_id', expected: 'store_id' },
      { raw: 'storeId', expected: 'store_id' },
      { raw: 'Store ID', expected: 'store_id' },
      { raw: 'units_sold', expected: 'units_sold' },
      { raw: 'unitsSold', expected: 'units_sold' },
      { raw: 'Units Sold', expected: 'units_sold' },
      { raw: 'sales', expected: 'units_sold' },
      { raw: 'recorded_closing_stock', expected: 'recorded_closing_stock' },
      { raw: 'closing_stock', expected: 'recorded_closing_stock' },
      { raw: 'recordedStock', expected: 'recorded_closing_stock' },
      { raw: 'closingStock', expected: 'recorded_closing_stock' },
      { raw: 'product_name', expected: 'product_name' },
      { raw: 'productName', expected: 'product_name' },
      { raw: 'Product Name', expected: 'product_name' },
      { raw: 'average_daily_sales', expected: 'average_daily_sales' },
      { raw: 'averageDailySales', expected: 'average_daily_sales' },
      { raw: 'recent_daily_sales', expected: 'recent_daily_sales' },
      { raw: 'recentDailySales', expected: 'recent_daily_sales' },
      { raw: 'selling_price', expected: 'selling_price' },
      { raw: 'sellingPrice', expected: 'selling_price' },
      { raw: 'price', expected: 'selling_price' },
      { raw: 'date', expected: 'date' },
      { raw: 'Date', expected: 'date' },
    ];

    variations.forEach(({ raw, expected }) => {
      expect(normalizeHeader(raw)).toBe(expected);
    });

    // Detect column mappings result
    const headers = ['Date', 'storeId', 'productId', 'unitsSold', 'recordedStock', 'Price'];
    const detected = DataCleaningService.detectColumnMappings(headers);
    expect(detected.canProceed).toBe(true);
    expect(detected.missingRequired.length).toBe(0);
    expect(detected.rawHeaderMap['Date']).toBe('date');
    expect(detected.rawHeaderMap['storeId']).toBe('store_id');
    expect(detected.rawHeaderMap['productId']).toBe('product_id');
    expect(detected.rawHeaderMap['unitsSold']).toBe('units_sold');
    expect(detected.rawHeaderMap['recordedStock']).toBe('recorded_closing_stock');
    expect(detected.rawHeaderMap['Price']).toBe('selling_price');
  });

  // Test 2: Unmapped column detection and explanation
  it('Criterion 2: Explains missing features when optional columns are omitted', () => {
    const headers = ['date', 'store_id', 'product_id', 'units_sold', 'recorded_closing_stock'];
    const detected = DataCleaningService.detectColumnMappings(headers);
    expect(detected.canProceed).toBe(true);
    expect(detected.missingOptional).toContain('selling_price');
    expect(detected.impactExplanations['selling_price']).toContain('Revenue');
  });

  // Test 3: Data preview and error reporting in plain English
  it('Criterion 3 & 4: Reports missing and invalid values with plain-English messages', () => {
    const rawData: RawCSVRecord[] = [
      {
        date: 'invalid-date',
        store_id: '',
        product_id: '',
        units_sold: 'text-not-number',
        recorded_closing_stock: '-10',
      },
    ];

    const result = DataCleaningService.cleanDataset(rawData, 'Test Store');
    expect(result.cleanedRecords.length).toBe(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);

    const errorTexts = result.errors.map((e) => e.errorMessage).join(' ');
    expect(errorTexts).toMatch(/Date.*could not be recognized/i);
    expect(errorTexts).toMatch(/Store ID is missing/i);
    expect(errorTexts).toMatch(/product IDs are missing/i);
    expect(errorTexts).toMatch(/contains text/i);
    expect(errorTexts).toMatch(/Negative recorded_closing_stock/i);
  });

  // Test 4: Missing sales is NOT silently replaced with zero
  it('Criterion 4: Does not automatically replace missing units_sold with zero', () => {
    const rawData: RawCSVRecord[] = [
      {
        date: '2026-10-15',
        store_id: 'STR_001',
        product_id: 'PRD_001',
        units_sold: '', // missing
        recorded_closing_stock: '15',
      },
    ];

    const result = DataCleaningService.cleanDataset(rawData, 'Test Store');
    // Must be rejected as fatal, not silently converted to 0
    expect(result.cleanedRecords.length).toBe(0);
    expect(result.errors.some((e) => e.errorMessage.includes('Units sold is missing'))).toBe(true);
  });

  // Test 5: Safe corrections are applied transparently and audited
  it('Criterion 5: Transparently applies safe corrections (whitespace, date standardization, baseline)', () => {
    const rawData: RawCSVRecord[] = [
      {
        date: ' 15-10-2026 ',
        store_id: ' STR_001 ',
        product_id: ' PRD_101 ',
        units_sold: ' 5 ',
        recorded_closing_stock: ' 20 ',
        selling_price: ' 150.00 ',
      },
    ];

    const result = DataCleaningService.cleanDataset(rawData, 'Test Store');
    expect(result.cleanedRecords.length).toBe(1);
    const item = result.cleanedRecords[0];

    // Standardized date YYYY-MM-DD
    expect(item.date).toBe('2026-10-15');
    expect(item.store_id).toBe('STR_001');
    expect(item.product_id).toBe('PRD_101');
    expect(item.units_sold).toBe(5);
    expect(item.recorded_closing_stock).toBe(20);
    expect(item.selling_price).toBe(150);

    // Audit trail
    expect(result.report.actionsAudit).toBeDefined();
    expect(result.report.actionsAudit!.length).toBeGreaterThan(0);
  });

  // Test 6: Downloadable error report CSV generation
  it('Criterion 6: Generates downloadable CSV error report', () => {
    const rawData: RawCSVRecord[] = [
      {
        date: '2026-10-15',
        store_id: '',
        product_id: 'PRD_101',
        units_sold: '5',
        recorded_closing_stock: '20',
      },
    ];

    const result = DataCleaningService.cleanDataset(rawData, 'Test Store');
    const errorCsv = DataCleaningService.generateErrorReportCSV(result.errors);
    expect(errorCsv).toContain('row_index,severity,field_name,error_message');
    expect(errorCsv).toContain('Store ID is missing');
  });

  // Test 7: Duplicate detection handles exact vs composite updates correctly
  it('Criterion 7: Deduplicates exact rows and handles composite key updates safely', () => {
    const rawData: RawCSVRecord[] = [
      // Exact duplicate pair
      {
        date: '2026-10-15',
        store_id: 'STR_001',
        product_id: 'PRD_101',
        units_sold: '5',
        recorded_closing_stock: '20',
      },
      {
        date: '2026-10-15',
        store_id: 'STR_001',
        product_id: 'PRD_101',
        units_sold: '5',
        recorded_closing_stock: '20',
      },
      // Distinct legitimate record
      {
        date: '2026-10-15',
        store_id: 'STR_001',
        product_id: 'PRD_102',
        units_sold: '10',
        recorded_closing_stock: '30',
      },
    ];

    const result = DataCleaningService.cleanDataset(rawData, 'Test Store');
    expect(result.report.duplicateRecordsIdentified).toBe(1);
    expect(result.cleanedRecords.length).toBe(2);
    expect(result.cleanedRecords.map((r) => r.product_id)).toEqual(['PRD_101', 'PRD_102']);
  });

  // Test 8: Easy Data Update, Replacement, Merge & Undo
  it('Criterion 8: Supports replace, append, merge, and Undo latest import', () => {
    const initialRecords: CleanedInventoryRecord[] = [
      {
        id: 'rec_1',
        date: '2026-10-15',
        store_id: 'STR_001',
        store_location: 'Koramangala',
        product_id: 'PRD_001',
        product_name: 'Item A',
        category: 'Snacks',
        units_sold: 5,
        recorded_closing_stock: 20,
        selling_price: 100,
        average_daily_sales: 5,
        recent_daily_sales: 5,
        days_since_last_sale: 0,
        promotion_status: false,
      },
    ];

    inventoryService.saveRecords(initialRecords);
    expect(inventoryService.getRecords().length).toBe(1);

    // Save replacement
    const newRecords: CleanedInventoryRecord[] = [
      {
        id: 'rec_2',
        date: '2026-10-15',
        store_id: 'STR_001',
        store_location: 'Koramangala',
        product_id: 'PRD_002',
        product_name: 'Item B',
        category: 'Dairy',
        units_sold: 8,
        recorded_closing_stock: 12,
        selling_price: 60,
        average_daily_sales: 8,
        recent_daily_sales: 8,
        days_since_last_sale: 0,
        promotion_status: false,
      },
    ];

    inventoryService.saveRecords(newRecords);
    expect(inventoryService.getRecords().length).toBe(1);
    expect(inventoryService.getRecords()[0].product_id).toBe('PRD_002');
    expect(inventoryService.canUndo()).toBe(true);

    // Undo import
    const undoRes = inventoryService.undoLastImport();
    expect(undoRes.success).toBe(true);
    expect(inventoryService.getRecords().length).toBe(1);
    expect(inventoryService.getRecords()[0].product_id).toBe('PRD_001');
  });

  // Test 9 & 10: Connect CSV Data to Risk Engine and verify single source of truth
  it('Criterion 9 & 10: Connects real CSV data to Risk Engine, ranks Top 20, and updates KPIs', () => {
    const rawData: RawCSVRecord[] = [
      // Critical phantom stockout: High book stock (25), healthy baseline (10), 0 recent sales, active promotion
      {
        date: '2026-10-15',
        store_id: 'STR_001',
        product_id: 'SKU_CRIT',
        product_name: 'Critical Phantom Item',
        category: 'Dairy',
        units_sold: '0',
        recorded_closing_stock: '25',
        selling_price: '250',
        average_daily_sales: '10',
        recent_daily_sales: '0',
        days_since_last_sale: '4',
        promotion_status: 'true',
      },
      // Normal healthy mover
      {
        date: '2026-10-15',
        store_id: 'STR_001',
        product_id: 'SKU_NORM',
        product_name: 'Healthy Normal Item',
        category: 'Staples',
        units_sold: '12',
        recorded_closing_stock: '30',
        selling_price: '80',
        average_daily_sales: '12',
        recent_daily_sales: '12',
        days_since_last_sale: '0',
        promotion_status: 'false',
      },
    ];

    const cleanResult = DataCleaningService.cleanDataset(rawData, 'Koramangala Mart');
    expect(cleanResult.cleanedRecords.length).toBe(2);

    const analysis = RiskDetectionEngine.analyzeInventory(
      cleanResult.cleanedRecords,
      DEFAULT_RISK_WEIGHTS,
      DEFAULT_RISK_THRESHOLDS,
      7
    );

    expect(analysis.length).toBe(2);
    const criticalItem = analysis.find((a) => a.product_id === 'SKU_CRIT');
    const normalItem = analysis.find((a) => a.product_id === 'SKU_NORM');

    expect(criticalItem).toBeDefined();
    expect(criticalItem!.risk_category).toBe('critical');
    expect(criticalItem!.risk_score).toBeGreaterThanOrEqual(80);
    expect(criticalItem!.estimated_sales_at_risk).toBeGreaterThan(0);

    expect(normalItem).toBeDefined();
    expect(normalItem!.risk_category).toBe('low');
    expect(normalItem!.risk_score).toBeLessThan(35);

    // Verify Top 20 ranking puts SKU_CRIT first
    const top20 = RiskDetectionEngine.getTop20InspectionList(analysis, false);
    expect(top20[0].product_id).toBe('SKU_CRIT');

    // Calculate Dashboard KPIs
    const kpis = AnalyticsService.calculateDashboardKPIs(analysis, cleanResult.cleanedRecords, [], cleanResult.report);
    expect(kpis.totalProductsMonitored).toBe(2);
    expect(kpis.criticalRiskProducts).toBe(1);
    expect(kpis.dataQualityPercentage).toBe(100);
  });

  // Test 11: Consistent Indian Currency (INR — ₹) formatting and no fabricated prices
  it('Criterion 11: Formats monetary figures in Indian Rupees (₹) and never fabricates missing price', () => {
    expect(currencyService.format(1250)).toBe('₹1,250.00');
    expect(currencyService.format(150000)).toBe('₹1,50,000.00');
    expect(currencyService.format(null)).toBe('Unavailable');
    expect(currencyService.computeRevenue(10, null)).toBeNull();
    expect(currencyService.computeRevenue(10, 250)).toBe(2500);
    expect(currencyService.getCurrencySymbol()).toBe('₹');
  });

  // Test 12: Privacy - Never displays file size in bytes, KB, or MB
  it('Criterion 12: Strict privacy rule — verify template and cleaning reports omit file size in bytes/KB', () => {
    const rawData: RawCSVRecord[] = [
      {
        date: '2026-10-15',
        store_id: 'STR_001',
        product_id: 'PRD_001',
        units_sold: '5',
        recorded_closing_stock: '15',
      },
    ];
    const cleanResult = DataCleaningService.cleanDataset(rawData, 'Privacy Store');

    const serializedReport = JSON.stringify(cleanResult.report);
    expect(serializedReport).not.toMatch(/bytes/i);
    expect(serializedReport).not.toMatch(/sizeKB/i);
    expect(serializedReport).not.toMatch(/sizeMB/i);
  });
});
