import { describe, it, expect } from 'vitest';
import {
  RiskDetectionEngine,
  DEFAULT_RISK_WEIGHTS,
  DEFAULT_RISK_THRESHOLDS,
} from '../services/riskDetectionEngine';
import { CleanedInventoryRecord } from '../types';

describe('Explainable Risk Detection Engine', () => {
  const mockBaseRecord: CleanedInventoryRecord = {
    id: 'test_1',
    date: '2026-10-14',
    store_id: 'STR_001',
    store_location: 'Central Branch',
    product_id: 'PRD_101',
    product_name: 'Chocolate Biscuits 300g',
    category: 'Snacks',
    units_sold: 0,
    recorded_closing_stock: 12,
    selling_price: 150.0,
    average_daily_sales: 8.0,
    recent_daily_sales: 0.0,
    days_since_last_sale: 3,
    promotion_status: true,
  };

  it('triggers high/critical risk for chocolate biscuits with sudden zero sales on active promotion', () => {
    // Chocolate biscuits example from section 7.6
    const results = RiskDetectionEngine.analyzeInventory([mockBaseRecord]);
    expect(results.length).toBe(1);

    const product = results[0];
    // Should trigger unexpected_zero_sales (30), sales_slowdown (25), stock_demand_inconsistency (18-20), last_sale_anomaly (15), promotion_signal (10)
    expect(product.risk_score).toBeGreaterThanOrEqual(80);
    expect(product.risk_category).toBe('critical');
    expect(product.recommended_action).toBe('Inspect immediately');

    // Human readable explanation should reflect triggers
    expect(product.human_readable_explanation).toContain('zero units were sold recently');
    expect(product.detected_factors.length).toBeGreaterThanOrEqual(3);
  });

  it('does not penalize products with accurate zero inventory (no phantom stock)', () => {
    const zeroStockRecord: CleanedInventoryRecord = {
      ...mockBaseRecord,
      recorded_closing_stock: 0,
      units_sold: 0,
      recent_daily_sales: 0,
    };

    const results = RiskDetectionEngine.analyzeInventory([zeroStockRecord]);
    expect(results[0].risk_score).toBe(0);
    expect(results[0].risk_category).toBe('low');
    expect(results[0].human_readable_explanation).toContain('accurately reflects depleted stock');
  });

  it('protects naturally slow-selling products from false positive phantom alerts', () => {
    // Sells once every 10 days (0.1 units/day)
    const slowSeller: CleanedInventoryRecord = {
      ...mockBaseRecord,
      product_name: 'Cardamom Seeds 25g',
      category: 'Gourmet',
      recorded_closing_stock: 3,
      average_daily_sales: 0.2, // naturally slow
      recent_daily_sales: 0.0,
      days_since_last_sale: 6,
      promotion_status: false,
    };

    const results = RiskDetectionEngine.analyzeInventory([slowSeller]);
    expect(results[0].risk_category).toBe('low');
    expect(results[0].risk_score).toBeLessThan(35);
  });

  it('calculates estimated sales at risk correctly according to section 8 formula', () => {
    // Expected daily = 8.0, Recent = 0 => Daily Gap = 8.0
    // Duration = 3 days, Selling Price = 150.0
    // Estimated Sales at Risk = 8.0 * 3 * 150.0 = ₹3,600.00
    const results = RiskDetectionEngine.analyzeInventory([mockBaseRecord]);
    expect(results[0].daily_expected_sales).toBe(8.0);
    expect(results[0].daily_sales_gap).toBe(8.0);
    expect(results[0].anomaly_duration).toBe(3);
    expect(results[0].estimated_sales_at_risk).toBe(3600.0);
  });

  it('returns null for estimated sales at risk when selling price is missing/unavailable', () => {
    const noPriceRecord: CleanedInventoryRecord = {
      ...mockBaseRecord,
      selling_price: null,
    };

    const results = RiskDetectionEngine.analyzeInventory([noPriceRecord]);
    expect(results[0].estimated_sales_at_risk).toBeNull();
  });

  it('prioritizes top 20 inspection list and breaks ties by demand velocity and anomaly duration', () => {
    const itemA: CleanedInventoryRecord = {
      ...mockBaseRecord,
      id: 'a',
      product_id: 'A',
      product_name: 'Item A',
      average_daily_sales: 10.0, // higher demand
      days_since_last_sale: 2,
    };

    const itemB: CleanedInventoryRecord = {
      ...mockBaseRecord,
      id: 'b',
      product_id: 'B',
      product_name: 'Item B',
      average_daily_sales: 5.0,
      days_since_last_sale: 2,
    };

    const analyzed = RiskDetectionEngine.analyzeInventory([itemB, itemA]);
    const topList = RiskDetectionEngine.getTop20InspectionList(analyzed, false);

    // Both may have same risk score, but itemA has higher average_daily_sales so it comes first
    expect(topList[0].product_id).toBe('A');
    expect(topList[1].product_id).toBe('B');
  });
});
