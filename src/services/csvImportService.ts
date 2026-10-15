import Papa from 'papaparse';
import {
  RawCSVRecord,
  CleanedInventoryRecord,
  ImportMode,
  RiskAlert,
  InspectionRecord,
  RiskAnalysisResult,
} from '../types';
import { DataCleaningService, CleaningResult } from './dataCleaningService';

export class CsvImportService {
  /**
   * Parse a raw CSV file or string into records using PapaParse
   */
  public static async parseCsvFile(file: File): Promise<RawCSVRecord[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<RawCSVRecord>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            // Check if there are non-fatal warnings vs fatal errors
            const fatal = results.errors.filter((e) => e.type === 'Delimiter' || e.code === 'UndetectableDelimiter');
            if (fatal.length > 0 && (!results.data || results.data.length === 0)) {
              reject(new Error(fatal[0].message));
              return;
            }
          }
          resolve(results.data || []);
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * Parse raw CSV text string
   */
  public static parseCsvString(csvString: string): RawCSVRecord[] {
    const parsed = Papa.parse<RawCSVRecord>(csvString, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });
    return parsed.data || [];
  }

  /**
   * Preview first N records
   */
  public static getPreviewRecords(rawRecords: RawCSVRecord[], count: number = 5): RawCSVRecord[] {
    return rawRecords.slice(0, count);
  }

  /**
   * Full pipeline: parse file and clean dataset
   */
  public static async importAndCleanFile(
    file: File,
    supermarketName: string,
    mode: ImportMode = 'replace',
    existingRecords: CleanedInventoryRecord[] = []
  ): Promise<CleaningResult> {
    const rawRows = await this.parseCsvFile(file);
    return DataCleaningService.cleanDataset(rawRows, supermarketName, mode, existingRecords);
  }

  /**
   * Export cleaned inventory records to CSV string
   */
  public static exportCleanedDataToCSV(records: CleanedInventoryRecord[]): string {
    const unparsed = Papa.unparse(records);
    return unparsed;
  }

  /**
   * Export risk analysis results to CSV string
   */
  public static exportAnalysisResultsToCSV(results: RiskAnalysisResult[]): string {
    const exportable = results.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      store_id: r.store_id,
      store_location: r.store_location,
      category: r.category,
      recorded_stock: r.recorded_stock,
      average_daily_sales: r.average_daily_sales,
      recent_daily_sales: r.recent_daily_sales,
      days_since_last_sale: r.days_since_last_sale,
      selling_price_inr: r.selling_price !== null ? r.selling_price : 'Unavailable',
      risk_score: r.risk_score,
      risk_category: r.risk_category.toUpperCase(),
      explanation: r.human_readable_explanation,
      recommended_action: r.recommended_action,
      estimated_sales_at_risk_inr: r.estimated_sales_at_risk !== null ? r.estimated_sales_at_risk : 'Unavailable',
      inspection_status: r.inspection_status,
      last_analyzed: r.last_analysis_timestamp,
    }));
    return Papa.unparse(exportable);
  }

  /**
   * Export risk alerts to CSV
   */
  public static exportAlertsToCSV(alerts: RiskAlert[]): string {
    const exportable = alerts.map((a) => ({
      alert_id: a.id,
      date: a.alert_date,
      product_id: a.product_id,
      product_name: a.product_name,
      store_id: a.store_id,
      store_location: a.store_location,
      risk_level: a.risk_level.toUpperCase(),
      risk_score: a.risk_score,
      anomaly: a.detected_anomaly,
      explanation: a.explanation,
      recommended_action: a.recommended_action,
      status: a.inspection_status,
      acknowledged: a.acknowledged ? 'Yes' : 'No',
    }));
    return Papa.unparse(exportable);
  }

  /**
   * Export inspection records to CSV
   */
  public static exportInspectionsToCSV(inspections: InspectionRecord[]): string {
    const exportable = inspections.map((i) => ({
      inspection_id: i.id,
      timestamp: i.timestamp,
      product_id: i.product_id,
      product_name: i.product_name,
      store_id: i.store_id,
      store_location: i.store_location || '',
      recorded_quantity: i.recorded_quantity,
      actual_shelf_quantity: i.actual_shelf_quantity,
      shelf_availability: i.shelf_availability,
      discrepancy_type: i.discrepancy_type,
      verified_discrepancy: i.verified_discrepancy ? 'VERIFIED' : 'UNCONFIRMED',
      confirmed_financial_loss_inr: i.confirmed_financial_loss !== null ? i.confirmed_financial_loss : 'N/A',
      inspector: i.inspector_name,
      notes: i.notes,
      status: i.status,
    }));
    return Papa.unparse(exportable);
  }

  /**
   * Export financial summary to CSV
   */
  public static exportFinancialSummaryToCSV(
    categoryStats: { category: string; recordedRevenue: number; estimatedSalesAtRisk: number; confirmedLoss: number }[]
  ): string {
    const exportable = categoryStats.map((c) => ({
      category: c.category,
      recorded_revenue_inr: c.recordedRevenue.toFixed(2),
      estimated_sales_at_risk_inr: c.estimatedSalesAtRisk.toFixed(2),
      confirmed_loss_inr: c.confirmedLoss.toFixed(2),
    }));
    return Papa.unparse(exportable);
  }

  /**
   * Browser file download helper
   */
  public static downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
