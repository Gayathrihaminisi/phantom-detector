import {
  CleanedInventoryRecord,
  RiskAnalysisResult,
  RiskDetectionRunRequest,
  RiskDetectionRunResponse,
  DetectionRunSummary,
  DetectionRunHistoryEntry,
  InspectionStatus,
  SystemSettings,
} from '../types';
import { RiskDetectionEngine, DEFAULT_RISK_WEIGHTS, DEFAULT_RISK_THRESHOLDS } from './riskDetectionEngine';
import { inventoryService } from './inventoryService';
import { AlertService } from './alertService';
import { inspectionService } from './inspectionService';

export class RiskDetectionService {
  private static isRunning: boolean = false;

  /**
   * Central entry point for executing the Risk Detection Engine
   */
  public static async executeRun(
    request: RiskDetectionRunRequest = {},
    settings?: SystemSettings
  ): Promise<RiskDetectionRunResponse> {
    const startTime = performance.now();

    // 0. Concurrency control: prevent duplicate parallel executions
    if (this.isRunning) {
      throw new Error('A risk detection run is already in progress. Please wait for it to complete.');
    }

    this.isRunning = true;

    try {
      // Small realistic processing tick so UI shows running state smoothly
      await new Promise((resolve) => setTimeout(resolve, 350));

      // 1. Verify and Load Dataset
      const rawRecords: CleanedInventoryRecord[] =
        request.records && request.records.length > 0
          ? request.records
          : inventoryService.getRecords();

      if (!rawRecords || rawRecords.length === 0) {
        throw new Error('Upload a valid dataset before running risk detection.');
      }

      // Filter by branch if a specific storeId was requested
      const recordsToEvaluate =
        request.storeId && request.storeId !== 'ALL'
          ? rawRecords.filter((r) => r.store_id === request.storeId)
          : rawRecords;

      if (recordsToEvaluate.length === 0) {
        throw new Error(`No inventory records found for branch filter "${request.storeId}".`);
      }

      // 2. Validate Required Columns and Data Integrity
      const sample = recordsToEvaluate[0];
      const requiredFields: (keyof CleanedInventoryRecord)[] = [
        'product_id',
        'store_id',
        'recorded_closing_stock',
        'units_sold',
      ];
      for (const field of requiredFields) {
        if (!(field in sample)) {
          throw new Error(`Dataset validation failed: missing required column "${field}".`);
        }
      }

      // 3. Load Saved Settings (Weights, Thresholds, Observation Window)
      const weights = request.weights || settings?.riskWeights || DEFAULT_RISK_WEIGHTS;
      const thresholds = request.thresholds || settings?.riskThresholds || DEFAULT_RISK_THRESHOLDS;
      const observationWindowDays =
        request.observationWindowDays || settings?.observationWindowDays || 7;

      // 4. Map existing inspection statuses
      const currentInspections = inspectionService.getInspections();
      const statusMap: Record<string, InspectionStatus> = {};
      currentInspections.forEach((i) => {
        statusMap[`${i.store_id}_${i.product_id}`] = i.status;
      });

      // 5. Execute Risk Detection Algorithm
      const results: RiskAnalysisResult[] = RiskDetectionEngine.analyzeInventory(
        recordsToEvaluate,
        weights,
        thresholds,
        observationWindowDays,
        statusMap
      );

      // 6. Synchronize Alerts without duplicates
      const alertService = AlertService.getInstance();
      const { alertsCreated, alertsUpdated } = alertService.syncAlertsDetailed(
        results,
        thresholds.medium
      );

      // 7. Calculate Counts and Summaries
      let criticalCount = 0;
      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;
      let missingPriceCount = 0;
      let recordsWithWarnings = 0;
      let totalSalesAtRisk = 0;
      let uninspectedActionableCount = 0;
      const warningSet = new Set<string>();

      results.forEach((item) => {
        switch (item.risk_category) {
          case 'critical':
            criticalCount++;
            break;
          case 'high':
            highCount++;
            break;
          case 'medium':
            mediumCount++;
            break;
          case 'low':
          default:
            lowCount++;
            break;
        }

        if (item.risk_score >= thresholds.medium && item.inspection_status !== 'resolved') {
          uninspectedActionableCount++;
        }

        if (item.selling_price === null || item.price_status !== 'valid') {
          missingPriceCount++;
        }

        if (item.data_quality_warnings && item.data_quality_warnings.length > 0) {
          recordsWithWarnings++;
          item.data_quality_warnings.forEach((w) => warningSet.add(w));
        }

        if (item.estimated_sales_at_risk !== null && item.estimated_sales_at_risk > 0) {
          totalSalesAtRisk += item.estimated_sales_at_risk;
        }
      });

      if (missingPriceCount > 0) {
        warningSet.add(
          `${missingPriceCount} of ${results.length} product(s) do not have selling prices. Financial exposure (₹) is unavailable for them until prices are added.`
        );
      }

      const warnings = Array.from(warningSet);
      const executionStatus: 'success' | 'warning' = warnings.length > 0 ? 'warning' : 'success';

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const timestamp = new Date().toISOString();
      const supermarketName =
        request.supermarketName || settings?.supermarketName || 'Supermarket Store';
      const cleaningReport = inventoryService.getCleaningReport();
      const datasetVersion = cleaningReport
        ? `v_${cleaningReport.importTimestamp}`
        : `snap_${timestamp.split('T')[0]}`;

      const summary: DetectionRunSummary = {
        totalEvaluated: results.length,
        criticalRiskCount: criticalCount,
        highRiskCount: highCount,
        mediumRiskCount: mediumCount,
        lowRiskCount: lowCount,
        alertsCreated,
        alertsUpdated,
        uninspectedActionableCount,
        recordsWithWarnings,
        missingPriceCount,
        totalSalesAtRisk: parseFloat(totalSalesAtRisk.toFixed(2)),
        durationMs,
      };

      const message =
        executionStatus === 'warning'
          ? `Detection completed with data warnings: ${results.length} products evaluated (${criticalCount} Critical, ${highCount} High). ${missingPriceCount} item(s) missing selling price.`
          : `Risk detection completed successfully: ${results.length} products evaluated in ${durationMs}ms (${criticalCount} Critical, ${highCount} High). ${alertsCreated} alerts created, ${alertsUpdated} updated.`;

      // 8. Persist Run and Timestamp
      inventoryService.setLastAnalysisTimestamp(timestamp);

      const historyEntry: DetectionRunHistoryEntry = {
        runId,
        timestamp,
        supermarketName,
        storeFilter: request.storeId || 'ALL',
        totalEvaluated: results.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        totalSalesAtRisk: parseFloat(totalSalesAtRisk.toFixed(2)),
        status: executionStatus,
        warningsCount: warnings.length,
        alertsUpdated: alertsCreated + alertsUpdated,
        message,
      };
      inventoryService.saveDetectionRun(historyEntry);

      return {
        runId,
        status: executionStatus,
        timestamp,
        supermarketName,
        storeFilter: request.storeId || 'ALL',
        datasetVersion,
        summary,
        warnings,
        results,
        message,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * API Endpoint Handler: POST /api/risk-detection/run
   * Provides full HTTP-compatible response for client requests or automated tests
   */
  public static async handleApiPostRun(payload: any): Promise<{
    status: number;
    headers: Record<string, string>;
    body: RiskDetectionRunResponse | { error: string };
  }> {
    try {
      const response = await this.executeRun(payload);
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: response,
      };
    } catch (err: any) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: { error: err.message || 'Risk detection run failed.' },
      };
    }
  }

  public static getRunHistory(): DetectionRunHistoryEntry[] {
    return inventoryService.getDetectionRunHistory();
  }
}

// Global fetch interceptor for /api/risk-detection/run if called via window.fetch
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/api/risk-detection/run') && init?.method === 'POST') {
      try {
        let bodyPayload = {};
        if (init.body && typeof init.body === 'string') {
          bodyPayload = JSON.parse(init.body);
        }
        const apiRes = await RiskDetectionService.handleApiPostRun(bodyPayload);
        return new Response(JSON.stringify(apiRes.body), {
          status: apiRes.status,
          headers: apiRes.headers,
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return originalFetch.apply(this, [input, init]);
  };
}
