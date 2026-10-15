import { describe, it, expect, beforeEach } from 'vitest';
import {
  RiskDetectionEngine,
  DEFAULT_RISK_WEIGHTS,
  DEFAULT_RISK_THRESHOLDS,
} from '../services/riskDetectionEngine';
import { RiskDetectionService } from '../services/riskDetectionService';
import { inventoryService } from '../services/inventoryService';
import { AlertService } from '../services/alertService';
import { inspectionService } from '../services/inspectionService';
import { CleanedInventoryRecord, RiskWeightsConfig, RiskThresholdsConfig } from '../types';

describe('Run Risk Detection Engine — 11 Section Test Specifications', () => {
  beforeEach(() => {
    // Clear localStorage and service state
    localStorage.clear();
    AlertService.getInstance().clearAll();
  });

  // Test 1 — Healthy product
  it('Test 1 — Healthy product: positive stock, normal sales, and valid price does not receive unjustified high risk', () => {
    const healthyRecord: CleanedInventoryRecord = {
      id: 'h1',
      date: '2026-10-15',
      store_id: 'STR_001',
      store_location: 'Central Branch',
      product_id: 'PRD_HEALTHY',
      product_name: 'Organic Milk 1L',
      category: 'Dairy',
      recorded_closing_stock: 25,
      units_sold: 10,
      selling_price: 65.0,
      average_daily_sales: 10.0,
      recent_daily_sales: 10.0,
      days_since_last_sale: 0,
      promotion_status: false,
    };

    const results = RiskDetectionEngine.analyzeInventory([healthyRecord]);
    expect(results.length).toBe(1);
    const item = results[0];

    expect(item.risk_score).toBe(0);
    expect(item.risk_category).toBe('low');
    expect(item.detected_factors.length).toBe(0);
    expect(item.estimated_sales_at_risk).toBe(0);
    expect(item.price_status).toBe('valid');
  });

  // Test 2 — Unexpected zero sales
  it('Test 2 — Unexpected zero sales: positive stock, avg sales 15, recent sales 0 triggers zero-sales rule', () => {
    const suddenZeroRecord: CleanedInventoryRecord = {
      id: 'z1',
      date: '2026-10-15',
      store_id: 'STR_001',
      store_location: 'Central Branch',
      product_id: 'PRD_ZERO',
      product_name: 'Basmati Rice 5kg',
      category: 'Grains',
      recorded_closing_stock: 40,
      units_sold: 0,
      selling_price: 450.0,
      average_daily_sales: 15.0,
      recent_daily_sales: 0.0,
      days_since_last_sale: 2,
      promotion_status: false,
    };

    const results = RiskDetectionEngine.analyzeInventory([suddenZeroRecord]);
    const item = results[0];

    const zeroSalesTrigger = item.detected_factors.find((f) => f.factor === 'unexpected_zero_sales');
    expect(zeroSalesTrigger).toBeDefined();
    expect(zeroSalesTrigger?.points).toBe(30);
    expect(item.risk_score).toBeGreaterThanOrEqual(30);
    expect(item.human_readable_explanation).toContain('zero units were sold recently');
  });

  // Test 3 — Sales slowdown
  it('Test 3 — Sales slowdown: average daily sales 20 and recent daily sales 8 calculates exactly 60% slowdown', () => {
    const slowdownRecord: CleanedInventoryRecord = {
      id: 's1',
      date: '2026-10-15',
      store_id: 'STR_001',
      store_location: 'Central Branch',
      product_id: 'PRD_SLOWDOWN',
      product_name: 'Potato Chips 150g',
      category: 'Snacks',
      recorded_closing_stock: 30,
      units_sold: 8,
      selling_price: 40.0,
      average_daily_sales: 20.0,
      recent_daily_sales: 8.0,
      days_since_last_sale: 0,
      promotion_status: false,
    };

    const results = RiskDetectionEngine.analyzeInventory([slowdownRecord]);
    const item = results[0];

    // slowdown_percentage = ((20 - 8) / 20) * 100 = 60%
    expect(item.slowdown_percentage).toBe(60);

    const slowdownTrigger = item.detected_factors.find((f) => f.factor === 'sales_slowdown');
    expect(slowdownTrigger).toBeDefined();
    expect(slowdownTrigger?.points).toBe(25);
    expect(slowdownTrigger?.explanation).toContain('Sales velocity dropped by 60%');
  });

  // Test 4 — Extended inactivity
  it('Test 4 — Extended inactivity: product not sold beyond inactivity threshold triggers rule with sufficient history', () => {
    const inactiveRecord: CleanedInventoryRecord = {
      id: 'i1',
      date: '2026-10-15',
      store_id: 'STR_001',
      store_location: 'Central Branch',
      product_id: 'PRD_INACTIVE',
      product_name: 'Cooking Oil 1L',
      category: 'Edible Oils',
      recorded_closing_stock: 20,
      units_sold: 0,
      selling_price: 180.0,
      average_daily_sales: 5.0, // expected interval: 0.2 days
      recent_daily_sales: 0.0,
      days_since_last_sale: 6, // 6 days >> expected interval
      promotion_status: false,
    };

    const results = RiskDetectionEngine.analyzeInventory([inactiveRecord]);
    const item = results[0];

    const inactivityTrigger = item.detected_factors.find((f) => f.factor === 'last_sale_anomaly');
    expect(inactivityTrigger).toBeDefined();
    expect(inactivityTrigger?.points).toBe(15);
    expect(inactivityTrigger?.explanation).toContain('Last sale occurred 6 days ago');
  });

  // Test 5 — Missing price
  it('Test 5 — Missing price: product is evaluated for non-financial anomalies; monetary exposure is unavailable (null)', () => {
    const missingPriceRecord: CleanedInventoryRecord = {
      id: 'mp1',
      date: '2026-10-15',
      store_id: 'STR_001',
      store_location: 'Central Branch',
      product_id: 'PRD_NOPRICE',
      product_name: 'Loose Sugar 1kg',
      category: 'Pantry',
      recorded_closing_stock: 50,
      units_sold: 0,
      selling_price: null, // Price missing!
      average_daily_sales: 12.0,
      recent_daily_sales: 0.0,
      days_since_last_sale: 4,
      promotion_status: false,
    };

    const results = RiskDetectionEngine.analyzeInventory([missingPriceRecord]);
    const item = results[0];

    // Non-financial rules should evaluate completely
    expect(item.risk_score).toBeGreaterThanOrEqual(50);
    expect(item.price_status).toBe('missing');
    // Financial exposure must NOT be fabricated or treated as ₹0
    expect(item.estimated_sales_at_risk).toBeNull();
    expect(item.data_quality_warnings).toContain('Price missing — financial exposure unavailable');
  });

  // Test 6 — Multiple branches
  it('Test 6 — Multiple branches: same product ID in two branches is evaluated independently without combining stock or sales', () => {
    const branch1Record: CleanedInventoryRecord = {
      id: 'b1',
      date: '2026-10-15',
      store_id: 'BRANCH_EAST',
      store_location: 'East Supermarket',
      product_id: 'PRD_SHARED',
      product_name: 'Instant Noodles 70g',
      category: 'Snacks',
      recorded_closing_stock: 100, // Branch 1: High stock, zero sales -> High risk
      units_sold: 0,
      selling_price: 25.0,
      average_daily_sales: 20.0,
      recent_daily_sales: 0.0,
      days_since_last_sale: 3,
      promotion_status: false,
    };

    const branch2Record: CleanedInventoryRecord = {
      id: 'b2',
      date: '2026-10-15',
      store_id: 'BRANCH_WEST',
      store_location: 'West Supermarket',
      product_id: 'PRD_SHARED',
      product_name: 'Instant Noodles 70g',
      category: 'Snacks',
      recorded_closing_stock: 15, // Branch 2: Normal stock, normal sales -> Low risk
      units_sold: 10,
      selling_price: 25.0,
      average_daily_sales: 10.0,
      recent_daily_sales: 10.0,
      days_since_last_sale: 0,
      promotion_status: false,
    };

    const results = RiskDetectionEngine.analyzeInventory([branch1Record, branch2Record]);
    expect(results.length).toBe(2);

    const eastItem = results.find((r) => r.store_id === 'BRANCH_EAST');
    const westItem = results.find((r) => r.store_id === 'BRANCH_WEST');

    expect(eastItem).toBeDefined();
    expect(westItem).toBeDefined();

    // Branch 1 has anomaly
    expect(eastItem!.risk_score).toBeGreaterThanOrEqual(70);
    expect(eastItem!.recorded_stock).toBe(100);

    // Branch 2 is healthy
    expect(westItem!.risk_score).toBe(0);
    expect(westItem!.recorded_stock).toBe(15);
  });

  // Test 7 — Settings update
  it('Test 7 — Settings update: changing a risk weight and threshold affects the detection result', () => {
    const testRecord: CleanedInventoryRecord = {
      id: 'w1',
      date: '2026-10-15',
      store_id: 'STR_001',
      store_location: 'Central Branch',
      product_id: 'PRD_WEIGHT_TEST',
      product_name: 'Almond Milk 1L',
      category: 'Dairy',
      recorded_closing_stock: 15,
      units_sold: 0,
      selling_price: 120.0,
      average_daily_sales: 10.0,
      recent_daily_sales: 0.0, // triggers unexpected_zero_sales
      days_since_last_sale: 1,
      promotion_status: false,
    };

    // Default weight for unexpectedZeroSales is 30
    const defaultResults = RiskDetectionEngine.analyzeInventory([testRecord]);
    const zeroRuleDefault = defaultResults[0].detected_factors.find(
      (f) => f.factor === 'unexpected_zero_sales'
    );
    expect(zeroRuleDefault?.points).toBe(30);

    // Custom weights: increase unexpectedZeroSales to 45
    const customWeights: RiskWeightsConfig = {
      ...DEFAULT_RISK_WEIGHTS,
      unexpectedZeroSales: 45,
    };

    const customResults = RiskDetectionEngine.analyzeInventory(
      [testRecord],
      customWeights
    );
    const zeroRuleCustom = customResults[0].detected_factors.find(
      (f) => f.factor === 'unexpected_zero_sales'
    );
    expect(zeroRuleCustom?.points).toBe(45);
    expect(customResults[0].risk_score).toBeGreaterThan(defaultResults[0].risk_score);
  });

  // Test 8 — Repeat detection
  it('Test 8 — Repeat detection: running detection twice on unchanged data produces consistent results without duplicate alerts', () => {
    const records: CleanedInventoryRecord[] = [
      {
        id: 'r1',
        date: '2026-10-15',
        store_id: 'STR_001',
        store_location: 'Central Branch',
        product_id: 'PRD_ALERT_TEST',
        product_name: 'Butter Cookies 200g',
        category: 'Bakery',
        recorded_closing_stock: 20,
        units_sold: 0,
        selling_price: 90.0,
        average_daily_sales: 8.0,
        recent_daily_sales: 0.0,
        days_since_last_sale: 3,
        promotion_status: false,
      },
    ];

    const alertService = AlertService.getInstance();
    alertService.clearAll();

    // First analysis & alert sync
    const results1 = RiskDetectionEngine.analyzeInventory(records);
    const sync1 = alertService.syncAlertsDetailed(results1, 25);
    expect(sync1.alertsCreated).toBe(1);
    expect(sync1.alertsUpdated).toBe(0);
    expect(alertService.getAlerts().length).toBe(1);

    // Second analysis on same records
    const results2 = RiskDetectionEngine.analyzeInventory(records);
    const sync2 = alertService.syncAlertsDetailed(results2, 25);
    // Should NOT create duplicate alerts
    expect(sync2.alertsCreated).toBe(0);
    expect(sync2.alertsUpdated).toBe(1);
    expect(alertService.getAlerts().length).toBe(1);
  });

  // Test 9 — No dataset
  it('Test 9 — No dataset: shows "Upload a valid dataset before running risk detection" instead of fake success', async () => {
    // Clear inventoryService records
    inventoryService.saveRecords([]);

    await expect(
      RiskDetectionService.executeRun({ records: [] })
    ).rejects.toThrow('Upload a valid dataset before running risk detection.');
  });

  // Test 10 — Backend failure
  it('Test 10 — Backend failure: UI handles backend failure and does not falsely report success', async () => {
    // Corrupt records missing required column
    const corruptRecords = [
      {
        id: 'bad1',
        // missing product_id, recorded_closing_stock, etc.
      } as any,
    ];

    await expect(
      RiskDetectionService.executeRun({ records: corruptRecords })
    ).rejects.toThrow(/Dataset validation failed/);
  });

  // Test 11 — Audit verification
  it('Test 11 — Audit verification: estimated risk remains strictly separate from confirmed financial loss until physical inspection', () => {
    const record: CleanedInventoryRecord = {
      id: 'aud1',
      date: '2026-10-15',
      store_id: 'STR_001',
      store_location: 'Central Branch',
      product_id: 'PRD_AUDIT',
      product_name: 'Premium Tea 250g',
      category: 'Beverages',
      recorded_closing_stock: 15,
      units_sold: 0,
      selling_price: 200.0,
      average_daily_sales: 6.0,
      recent_daily_sales: 0.0,
      days_since_last_sale: 2,
      promotion_status: false,
    };

    const results = RiskDetectionEngine.analyzeInventory([record]);
    const item = results[0];

    // Detection calculates ESTIMATED exposure
    expect(item.estimated_sales_at_risk).toBeGreaterThan(0);
    expect(item.inspection_status).toBe('pending');

    // Confirmed loss before physical inspection is empty
    inspectionService.clearAll();
    expect(inspectionService.getInspections().length).toBe(0);

    // Physical inspection is logged through inspectionService
    const inspection = inspectionService.recordInspection({
      productId: item.product_id,
      productName: item.product_name,
      storeId: item.store_id,
      recordedQuantity: item.recorded_stock,
      actualShelfQuantity: 10, // 5 units missing (15 - 10)
      shelfAvailability: 'available',
      discrepancyType: 'theft_suspected',
      notes: 'Shelf empty, only 10 found in back room',
      inspectorName: 'Auditor One',
      sellingPrice: item.selling_price || 200.0,
      status: 'resolved',
    });

    // Verified discrepancy is true, confirmed loss is 5 * 200 = ₹1000
    expect(inspection.verified_discrepancy).toBe(true);
    expect(inspection.confirmed_financial_loss).toBe(1000.0);
    expect(inspection.status).toBe('resolved');

    // Confirmed loss comes from physical audit, while estimated exposure was risk projection
    expect(inspection.confirmed_financial_loss).not.toBe(item.estimated_sales_at_risk);
  });
});
