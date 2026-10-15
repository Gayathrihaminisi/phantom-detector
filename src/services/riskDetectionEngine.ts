import {
  CleanedInventoryRecord,
  RiskAnalysisResult,
  RiskCategory,
  RiskFactorTrigger,
  RiskWeightsConfig,
  RiskThresholdsConfig,
  InspectionStatus,
} from '../types';

export const DEFAULT_RISK_WEIGHTS: RiskWeightsConfig = {
  unexpectedZeroSales: 30,
  salesSlowdown: 25,
  stockDemandInconsistency: 20,
  lastSaleAnomaly: 15,
  promotionSignal: 10,
};

export const DEFAULT_RISK_THRESHOLDS: RiskThresholdsConfig = {
  critical: 75,
  high: 50,
  medium: 25,
};

export class RiskDetectionEngine {
  /**
   * Run the explainable rule-based anomaly detection engine on a cleaned dataset
   * Adheres strictly to the additive scoring model: raw_score = sum(weights of triggered rules)
   * Score is capped between 0 and 100.
   */
  public static analyzeInventory(
    records: CleanedInventoryRecord[],
    weights: RiskWeightsConfig = DEFAULT_RISK_WEIGHTS,
    thresholds: RiskThresholdsConfig = DEFAULT_RISK_THRESHOLDS,
    observationWindowDays: number = 7,
    existingInspectionStatuses: Record<string, InspectionStatus> = {},
    slowdownThresholdPercentage: number = 50,
    inactivityThresholdDays: number = 3
  ): RiskAnalysisResult[] {
    const timestamp = new Date().toISOString();

    return records.map((record) => {
      const triggers: RiskFactorTrigger[] = [];
      const dataQualityWarnings: string[] = [];
      let rawScore = 0;
      const totalPossibleEvidence = 5;
      let availableEvidence = 0;

      const {
        product_id,
        product_name,
        store_id,
        store_location,
        category,
        recorded_closing_stock,
        selling_price,
        average_daily_sales,
        recent_daily_sales,
        days_since_last_sale,
        promotion_status,
        date,
      } = record;

      // 0. Validate Data Quality & Non-Financial Inputs
      let priceStatus: 'valid' | 'missing' | 'invalid' = 'valid';
      if (selling_price === null || selling_price === undefined || isNaN(selling_price)) {
        priceStatus = 'missing';
        dataQualityWarnings.push('Price missing — financial exposure unavailable');
      } else if (selling_price <= 0) {
        priceStatus = 'invalid';
        dataQualityWarnings.push('Price missing — financial exposure unavailable');
      }

      const isInvalidRecentSales = recent_daily_sales < 0 || isNaN(recent_daily_sales);
      if (isInvalidRecentSales) {
        dataQualityWarnings.push(`Invalid recent daily sales (${recent_daily_sales}). Rule calculations skipped.`);
      }

      // Filter: Natural slow sellers (selling less than 0.5 units/day on average)
      // Products that sell only once a week or month shouldn't be penalized as phantom stockouts
      const isSlowSeller = average_daily_sales < 0.5;
      if (isSlowSeller && average_daily_sales >= 0) {
        dataQualityWarnings.push('Low historical demand (<0.5 units/day). Natural slow-mover excluded from velocity penalties.');
      }

      // ----------------------------------------------------
      // RULE A: Unexpected Zero Sales (Weight: 30 pts)
      // ----------------------------------------------------
      // Trigger when:
      // - Recorded closing stock is greater than zero
      // - Recent daily sales are zero
      // - Average daily sales indicate meaningful historical demand (>= 1.0)
      // - Valid non-negative sales data
      if (average_daily_sales >= 0 && !isInvalidRecentSales) {
        availableEvidence++;
      }

      if (
        recorded_closing_stock > 0 &&
        recent_daily_sales === 0 &&
        average_daily_sales >= 1.0 &&
        !isInvalidRecentSales
      ) {
        const points = weights.unexpectedZeroSales;
        rawScore += points;
        triggers.push({
          factor: 'unexpected_zero_sales',
          name: 'Unexpected Zero Sales',
          baseWeight: weights.unexpectedZeroSales,
          points,
          effectiveScore: points,
          evidenceConfidence: 1.0,
          explanation: `System records ${recorded_closing_stock} units in stock, but zero units were sold recently despite historical demand of ${average_daily_sales} units/day.`,
          evidence: {
            recorded_closing_stock,
            recent_daily_sales,
            average_daily_sales,
          },
        });
      }

      // ----------------------------------------------------
      // RULE B: Sales Velocity Slowdown (Weight: 25 pts)
      // ----------------------------------------------------
      // slowdown_percentage = ((average_daily_sales - recent_daily_sales) / average_daily_sales) * 100
      // Only perform when average_daily_sales > 0 and valid recent sales.
      // Trigger when slowdown >= threshold (default 50%) and recorded closing stock > 0.
      let slowdownPercentage: number | null = null;
      if (average_daily_sales > 0 && !isInvalidRecentSales) {
        availableEvidence++;
        slowdownPercentage = parseFloat(
          (((average_daily_sales - recent_daily_sales) / average_daily_sales) * 100).toFixed(1)
        );

        if (
          !isSlowSeller &&
          recorded_closing_stock > 0 &&
          slowdownPercentage >= slowdownThresholdPercentage
        ) {
          const points = weights.salesSlowdown;
          rawScore += points;
          triggers.push({
            factor: 'sales_slowdown',
            name: 'Sales Velocity Slowdown',
            baseWeight: weights.salesSlowdown,
            points,
            effectiveScore: points,
            evidenceConfidence: 1.0,
            explanation: `Sales velocity dropped by ${slowdownPercentage}% (from ${average_daily_sales} to ${recent_daily_sales} units/day) while ${recorded_closing_stock} units remain recorded in stock.`,
            evidence: {
              average_daily_sales,
              recent_daily_sales,
              slowdown_percentage: slowdownPercentage,
              threshold: slowdownThresholdPercentage,
            },
          });
        }
      }

      // ----------------------------------------------------
      // RULE C: Stock-Demand Disparity (Weight: 20 pts)
      // ----------------------------------------------------
      // Evaluate whether recorded stock, historical demand, and recent sales show meaningful inconsistency.
      // Trigger condition:
      // - Plentiful book stock (recorded_closing_stock >= 5)
      // - Strong expected demand (average_daily_sales >= 2.0)
      // - Recent checkout rate is under 25% of expected demand (recent_daily_sales <= average_daily_sales * 0.25)
      // - Observation period valid (observationWindowDays >= 3)
      availableEvidence++;
      if (
        recorded_closing_stock >= 5 &&
        average_daily_sales >= 2.0 &&
        !isInvalidRecentSales &&
        recent_daily_sales <= average_daily_sales * 0.25 &&
        observationWindowDays >= 3
      ) {
        const points = weights.stockDemandInconsistency;
        rawScore += points;
        const checkoutRatio = Math.round((recent_daily_sales / average_daily_sales) * 100);
        triggers.push({
          factor: 'stock_demand_inconsistency',
          name: 'Stock-Demand Disparity',
          baseWeight: weights.stockDemandInconsistency,
          points,
          effectiveScore: points,
          evidenceConfidence: 1.0,
          explanation: `Book stock shows plentiful availability (${recorded_closing_stock} units), yet recent customer checkout rate is only ${checkoutRatio}% of normal demand (${recent_daily_sales} vs expected ${average_daily_sales} units/day).`,
          evidence: {
            recorded_closing_stock,
            average_daily_sales,
            recent_daily_sales,
            checkout_rate_percentage: checkoutRatio,
          },
        });
      }

      // ----------------------------------------------------
      // RULE D: Extended Inactivity (Weight: 15 pts)
      // ----------------------------------------------------
      // Compare days since last sale with configurable inactivity threshold or product-specific selling frequency:
      // expected_sale_interval_days = 1 / average_daily_sales
      // inactivity_threshold = Math.max(inactivityThresholdDays, expected_sale_interval_days * 2.5)
      // Do not flag natural slow sellers.
      availableEvidence++;
      const expectedSaleIntervalDays = average_daily_sales > 0 ? 1 / average_daily_sales : 7;
      const effectiveInactivityThreshold = Math.max(
        inactivityThresholdDays,
        expectedSaleIntervalDays * 2.5
      );

      if (
        days_since_last_sale >= effectiveInactivityThreshold &&
        recorded_closing_stock > 0 &&
        !isSlowSeller &&
        average_daily_sales >= 0.5
      ) {
        const points = weights.lastSaleAnomaly;
        rawScore += points;
        triggers.push({
          factor: 'last_sale_anomaly',
          name: 'Extended Inactivity',
          baseWeight: weights.lastSaleAnomaly,
          points,
          effectiveScore: points,
          evidenceConfidence: 1.0,
          explanation: `Last sale occurred ${days_since_last_sale} days ago, exceeding the expected interval of ${expectedSaleIntervalDays.toFixed(1)} days for this item's sales velocity.`,
          evidence: {
            days_since_last_sale,
            expected_interval_days: parseFloat(expectedSaleIntervalDays.toFixed(1)),
            threshold_days: parseFloat(effectiveInactivityThreshold.toFixed(1)),
          },
        });
      }

      // ----------------------------------------------------
      // RULE E: Promotion or High-Demand Stoppage Signal (Weight: 10 pts)
      // ----------------------------------------------------
      // Trigger when a promoted product or high-velocity staple (>= 5 units/day) has zero sales despite stock.
      availableEvidence++;
      if (
        (promotion_status === true || average_daily_sales >= 5.0) &&
        recent_daily_sales === 0 &&
        recorded_closing_stock > 0 &&
        !isInvalidRecentSales
      ) {
        const points = weights.promotionSignal;
        rawScore += points;
        triggers.push({
          factor: 'promotion_signal',
          name: promotion_status ? 'Active Promotion Zero Sales' : 'Fast-Mover Stoppage',
          baseWeight: weights.promotionSignal,
          points,
          effectiveScore: points,
          evidenceConfidence: 1.0,
          explanation: promotion_status
            ? `Active supermarket promotion running, but zero sales recorded today despite ${recorded_closing_stock} units recorded in stock.`
            : `High-velocity product (${average_daily_sales} units/day) abruptly stopped moving with ${recorded_closing_stock} units in system.`,
          evidence: {
            promotion_status,
            average_daily_sales,
            recorded_closing_stock,
          },
        });
      }

      // ----------------------------------------------------
      // SCORE CALCULATION & CLASSIFICATION (Section 5)
      // ----------------------------------------------------
      // raw_score = sum(weights of triggered rules)
      // Normalized between 0 and 100
      const risk_score = Math.min(100, Math.max(0, rawScore));

      // Classifications based on configured thresholds
      let risk_category: RiskCategory;
      if (risk_score >= thresholds.critical) {
        risk_category = 'critical';
      } else if (risk_score >= thresholds.high) {
        risk_category = 'high';
      } else if (risk_score >= thresholds.medium) {
        risk_category = 'medium';
      } else {
        risk_category = 'low';
      }

      // Recommended inspection action
      let recommended_action: string;
      switch (risk_category) {
        case 'critical':
          recommended_action = 'Inspect immediately';
          break;
        case 'high':
          recommended_action = "Prioritize for today's shelf audit";
          break;
        case 'medium':
          recommended_action = 'Schedule follow-up shelf check';
          break;
        case 'low':
        default:
          recommended_action = 'Continue routine automated monitoring';
          break;
      }

      // Explainable human-readable summary
      let human_readable_explanation: string;
      if (triggers.length === 0) {
        human_readable_explanation =
          recorded_closing_stock === 0
            ? 'Stock level is zero; inventory system accurately reflects depleted stock (no discrepancy).'
            : 'Sales velocity matches inventory availability. No phantom stock-out indicators triggered.';
      } else {
        human_readable_explanation = triggers.map((t) => t.explanation).join(' ');
      }

      // Data completeness percentage
      const completeness = Math.round((availableEvidence / totalPossibleEvidence) * 100);

      // ----------------------------------------------------
      // ESTIMATED SALES AT RISK (Section 7)
      // ----------------------------------------------------
      // daily_sales_gap = max(0, average_daily_sales - recent_daily_sales)
      // estimated_sales_at_risk = daily_sales_gap * exposure_days * selling_price
      // Skip financial estimates when prices are missing or invalid
      const daily_expected_sales = Math.max(average_daily_sales, 0);
      const daily_sales_gap = isInvalidRecentSales
        ? 0
        : Math.max(0, parseFloat((daily_expected_sales - recent_daily_sales).toFixed(2)));

      const anomaly_duration = Math.max(
        1,
        Math.min(days_since_last_sale || 1, observationWindowDays)
      );

      let estimated_sales_at_risk: number | null = null;
      if (priceStatus === 'valid' && selling_price !== null && selling_price > 0) {
        if (risk_score >= thresholds.medium && daily_sales_gap > 0) {
          estimated_sales_at_risk = parseFloat(
            (daily_sales_gap * anomaly_duration * selling_price).toFixed(2)
          );
        } else {
          estimated_sales_at_risk = 0;
        }
      }

      // Check existing inspection status
      const itemKey = `${store_id}_${product_id}`;
      const inspection_status: InspectionStatus = existingInspectionStatuses[itemKey] || 'pending';

      return {
        product_id,
        product_name,
        store_id,
        store_location,
        category,
        recorded_stock: recorded_closing_stock,
        average_daily_sales,
        recent_daily_sales,
        days_since_last_sale,
        selling_price: priceStatus === 'valid' ? selling_price : null,
        promotion_status,
        date,
        risk_score,
        risk_category,
        detected_factors: triggers,
        human_readable_explanation,
        recommended_action,
        data_completeness: completeness,
        last_analysis_timestamp: timestamp,
        daily_expected_sales,
        daily_sales_gap,
        anomaly_duration,
        estimated_sales_at_risk,
        inspection_status,
        data_quality_warnings: dataQualityWarnings,
        price_status: priceStatus,
        slowdown_percentage: slowdownPercentage,
      };
    });
  }

  /**
   * Top 20 Daily Inspection Prioritization (Section 8 & 12)
   * - Automatically rank eligible products by calculated risk score (descending)
   * - Ties broken by estimated demand (average_daily_sales) and anomaly duration
   * - Max 20 products
   * - Never creates fake alerts to fill the list
   */
  public static getTop20InspectionList(
    analysisResults: RiskAnalysisResult[],
    excludeResolved: boolean = true,
    mediumThreshold: number = DEFAULT_RISK_THRESHOLDS.medium
  ): RiskAnalysisResult[] {
    let eligible = [...analysisResults];

    if (excludeResolved) {
      eligible = eligible.filter((item) => item.inspection_status !== 'resolved');
    }

    // Filter to those with actionable risk (score >= mediumThreshold, i.e. medium, high, critical)
    eligible = eligible.filter((item) => item.risk_score >= mediumThreshold);

    // Sort: risk_score DESC -> average_daily_sales DESC -> anomaly_duration DESC
    eligible.sort((a, b) => {
      if (b.risk_score !== a.risk_score) {
        return b.risk_score - a.risk_score;
      }
      if (b.average_daily_sales !== a.average_daily_sales) {
        return b.average_daily_sales - a.average_daily_sales;
      }
      return b.anomaly_duration - a.anomaly_duration;
    });

    return eligible.slice(0, 20);
  }
}
