import {
  CleanedInventoryRecord,
  RiskAnalysisResult,
  InspectionRecord,
  DashboardKPIs,
  DataCleaningReport,
} from '../types';

export class AnalyticsService {
  /**
   * Compute comprehensive dashboard KPIs
   */
  public static computeDashboardKPIs(
    analysisResults: RiskAnalysisResult[],
    inspections: InspectionRecord[],
    cleaningReport: DataCleaningReport | null,
    lastAnalysisTime: string | null
  ): DashboardKPIs {
    const totalProducts = analysisResults.length;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let totalSalesAtRisk = 0;

    analysisResults.forEach((item) => {
      switch (item.risk_category) {
        case 'critical':
          critical++;
          break;
        case 'high':
          high++;
          break;
        case 'medium':
          medium++;
          break;
        case 'low':
        default:
          low++;
          break;
      }

      if (item.estimated_sales_at_risk !== null && item.estimated_sales_at_risk > 0) {
        totalSalesAtRisk += item.estimated_sales_at_risk;
      }
    });

    // Inspections
    const todayStr = new Date().toISOString().split('T')[0];
    let completedToday = 0;
    let openInspections = 0;
    let confirmedDiscrepancies = 0;
    let confirmedFinancialLoss = 0;

    inspections.forEach((insp) => {
      if (insp.status === 'pending' || insp.status === 'in_progress') {
        openInspections++;
      }
      if (insp.timestamp.startsWith(todayStr)) {
        completedToday++;
      }
      if (insp.verified_discrepancy) {
        confirmedDiscrepancies++;
        if (insp.confirmed_financial_loss !== null) {
          confirmedFinancialLoss += insp.confirmed_financial_loss;
        }
      }
    });

    return {
      totalProductsMonitored: totalProducts,
      criticalRiskProducts: critical,
      highRiskProducts: high,
      mediumRiskProducts: medium,
      lowRiskProducts: low,
      openInspections,
      inspectionsCompletedToday: completedToday,
      estimatedSalesAtRisk: parseFloat(totalSalesAtRisk.toFixed(2)),
      confirmedDiscrepancies,
      confirmedFinancialLoss: parseFloat(confirmedFinancialLoss.toFixed(2)),
      dataQualityPercentage: cleaningReport ? cleaningReport.dataQualityPercentage : 100,
      lastAnalysisTimestamp: lastAnalysisTime,
    };
  }

  /**
   * Alias for computeDashboardKPIs
   */
  public static calculateDashboardKPIs(
    analysisResults: RiskAnalysisResult[],
    inventoryRecords: CleanedInventoryRecord[],
    inspections: InspectionRecord[],
    cleaningReport: DataCleaningReport | null,
    lastAnalysisTime: string | null = null
  ): DashboardKPIs {
    return this.computeDashboardKPIs(analysisResults, inspections, cleaningReport, lastAnalysisTime);
  }

  /**
   * Risk distribution for donut / pie chart
   */
  public static getRiskCategoryBreakdown(analysisResults: RiskAnalysisResult[]) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    analysisResults.forEach((r) => {
      counts[r.risk_category]++;
    });
    return [
      { name: 'Critical Risk', value: counts.critical, color: '#ef4444', key: 'critical' },
      { name: 'High Risk', value: counts.high, color: '#f97316', key: 'high' },
      { name: 'Medium Risk', value: counts.medium, color: '#eab308', key: 'medium' },
      { name: 'Low Risk', value: counts.low, color: '#10b981', key: 'low' },
    ];
  }

  /**
   * Category wise risk & sales at risk
   */
  public static getCategoryRiskBreakdown(analysisResults: RiskAnalysisResult[]) {
    const map = new Map<string, { category: string; critical: number; high: number; medium: number; salesAtRisk: number; totalProducts: number }>();

    analysisResults.forEach((item) => {
      const cat = item.category || 'General';
      if (!map.has(cat)) {
        map.set(cat, { category: cat, critical: 0, high: 0, medium: 0, salesAtRisk: 0, totalProducts: 0 });
      }
      const entry = map.get(cat)!;
      entry.totalProducts++;
      if (item.risk_category === 'critical') entry.critical++;
      if (item.risk_category === 'high') entry.high++;
      if (item.risk_category === 'medium') entry.medium++;
      if (item.estimated_sales_at_risk) {
        entry.salesAtRisk += item.estimated_sales_at_risk;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.salesAtRisk - a.salesAtRisk);
  }

  /**
   * Revenue trends by date
   */
  public static getRevenueTrendByDate(records: CleanedInventoryRecord[]) {
    const dateMap = new Map<string, { date: string; recordedRevenue: number; unitsSold: number }>();

    records.forEach((r) => {
      const d = r.date;
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d, recordedRevenue: 0, unitsSold: 0 });
      }
      const entry = dateMap.get(d)!;
      entry.unitsSold += r.units_sold;
      if (r.selling_price !== null) {
        entry.recordedRevenue += r.units_sold * r.selling_price;
      }
    });

    return Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({
        ...entry,
        recordedRevenue: parseFloat(entry.recordedRevenue.toFixed(2)),
      }));
  }

  /**
   * Store wise revenue and risk comparison
   */
  public static getStoreComparison(analysisResults: RiskAnalysisResult[], records: CleanedInventoryRecord[]) {
    const storeMap = new Map<string, { store_id: string; location: string; recordedRevenue: number; riskCount: number; salesAtRisk: number }>();

    records.forEach((r) => {
      const id = r.store_id;
      if (!storeMap.has(id)) {
        storeMap.set(id, {
          store_id: id,
          location: r.store_location || id,
          recordedRevenue: 0,
          riskCount: 0,
          salesAtRisk: 0,
        });
      }
      const s = storeMap.get(id)!;
      if (r.selling_price !== null) {
        s.recordedRevenue += r.units_sold * r.selling_price;
      }
    });

    analysisResults.forEach((a) => {
      const id = a.store_id;
      if (storeMap.has(id)) {
        const s = storeMap.get(id)!;
        if (a.risk_score >= 60) s.riskCount++;
        if (a.estimated_sales_at_risk) s.salesAtRisk += a.estimated_sales_at_risk;
      }
    });

    return Array.from(storeMap.values()).map((s) => ({
      ...s,
      recordedRevenue: parseFloat(s.recordedRevenue.toFixed(2)),
      salesAtRisk: parseFloat(s.salesAtRisk.toFixed(2)),
    }));
  }
}
