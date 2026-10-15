// Core TypeScript Types for Phantom Stock-Out Detector

export type RiskCategory = 'critical' | 'high' | 'medium' | 'low';

export type RiskFactorType =
  | 'unexpected_zero_sales'
  | 'sales_slowdown'
  | 'stock_demand_inconsistency'
  | 'last_sale_anomaly'
  | 'promotion_signal';

export interface ManagerProfile {
  id: string;
  fullName: string;
  email: string;
  supermarketName: string;
  supermarketLocation?: string;
  contactNumber?: string;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  manager: ManagerProfile | null;
  rememberMe: boolean;
  onboardingCompleted: boolean;
  currentOnboardingStep: number;
}

export interface RawCSVRecord {
  [key: string]: string | undefined;
}

export interface CleanedInventoryRecord {
  id: string; // unique internal row id
  date: string; // YYYY-MM-DD
  store_id: string;
  store_location: string;
  product_id: string;
  product_name: string;
  category: string;
  units_sold: number;
  recorded_closing_stock: number;
  selling_price: number | null; // null if unavailable
  average_daily_sales: number;
  recent_daily_sales: number;
  days_since_last_sale: number;
  promotion_status: boolean;
  replenishment_date?: string;
  replenishment_quantity?: number;
  is_inferred_baseline?: boolean;
}

export interface ValidationError {
  rowIndex: number;
  rawRow: Record<string, any>;
  fieldName?: string;
  errorMessage: string;
  severity: 'error' | 'warning';
  canBeCorrected?: boolean;
}

export interface ImportHistoryEntry {
  id: string;
  filename: string;
  timestamp: string;
  mode: ImportMode;
  totalRows: number;
  validAccepted: number;
  duplicates: number;
  rejected: number;
  recordsCorrected: number;
  dataQualityPercentage: number;
  status: 'completed' | 'undone';
}

export interface ColumnMappingInfo {
  rawHeader: string;
  canonicalField: string;
  confidence: 'high' | 'medium' | 'low' | 'unmapped';
  isRequired: boolean;
  isOptional: boolean;
  description: string;
}

export interface ColumnMappingDetectionResult {
  mappings: ColumnMappingInfo[];
  rawHeaderMap: Record<string, string>;
  missingRequired: string[];
  missingOptional: string[];
  unmappedHeaders: string[];
  impactExplanations: Record<string, string>;
  canProceed: boolean;
}

export interface CleaningActionAudit {
  id: string;
  rowIndex: number;
  fieldName: string;
  action: 'trimmed_whitespace' | 'date_normalized' | 'header_mapped' | 'baseline_inferred' | 'negative_corrected' | 'manual_edit';
  originalValue: string;
  correctedValue: string;
  description: string;
}

export interface DataCleaningReport {
  totalRowsReceived: number;
  validAcceptedRecords: number;
  recordsCorrected: number;
  duplicateRecordsIdentified: number;
  invalidRecordsRejected: number;
  missingValueWarnings: number;
  cleaningStepsCompleted: string[];
  dataQualityPercentage: number;
  requiresReview: boolean;
  importTimestamp: string;
  supermarketName: string;
  importMode: 'replace' | 'append' | 'merge';
  actionsAudit?: CleaningActionAudit[];
  historyId?: string;
  unmappedColumns?: string[];
  missingOptionalColumns?: string[];
}

export type ImportMode = 'replace' | 'append' | 'merge';

export interface RiskFactorTrigger {
  factor: RiskFactorType;
  name: string;
  baseWeight: number;
  evidenceConfidence: number; // 0 to 1
  effectiveScore: number;
  points?: number; // Raw points contributed
  explanation: string;
  evidence?: Record<string, any>; // Underlying values triggering rule
}

export interface RiskAnalysisResult {
  product_id: string;
  product_name: string;
  store_id: string;
  store_location: string;
  category: string;
  recorded_stock: number;
  average_daily_sales: number;
  recent_daily_sales: number;
  days_since_last_sale: number;
  selling_price: number | null;
  promotion_status: boolean;
  date: string;
  
  risk_score: number; // 0 - 100
  risk_category: RiskCategory;
  detected_factors: RiskFactorTrigger[];
  human_readable_explanation: string;
  recommended_action: string;
  data_completeness: number; // percentage 0 - 100
  last_analysis_timestamp: string;

  // Sales at risk calculations
  daily_expected_sales: number;
  daily_sales_gap: number;
  anomaly_duration: number;
  estimated_sales_at_risk: number | null; // null if selling price missing
  inspection_status: InspectionStatus;

  // Data quality and rule details
  data_quality_warnings?: string[];
  price_status?: 'valid' | 'missing' | 'invalid';
  slowdown_percentage?: number | null;
}

export type InspectionStatus = 'pending' | 'in_progress' | 'resolved' | 'follow_up';

export type DiscrepancyType =
  | 'phantom_stockout_verified'
  | 'damaged_inventory'
  | 'misplaced_stock'
  | 'theft_suspected'
  | 'recording_system_lag'
  | 'none_stock_present';

export interface InspectionRecord {
  id: string;
  product_id: string;
  product_name: string;
  store_id: string;
  store_location?: string;
  recorded_quantity: number;
  actual_shelf_quantity: number;
  shelf_availability: 'available' | 'unavailable';
  discrepancy_type: DiscrepancyType;
  notes: string;
  timestamp: string;
  inspector_name: string;
  verified_discrepancy: boolean;
  confirmed_financial_loss: number | null; // (recorded - actual) * price if verified
  status: InspectionStatus;
}

export interface RiskAlert {
  id: string;
  product_id: string;
  product_name: string;
  store_id: string;
  store_location: string;
  risk_level: RiskCategory;
  risk_score: number;
  alert_date: string;
  detected_anomaly: string;
  explanation: string;
  recommended_action: string;
  inspection_status: InspectionStatus;
  acknowledged: boolean;
  acknowledged_at?: string;
}

export interface RiskWeightsConfig {
  unexpectedZeroSales: number; // base: 30
  salesSlowdown: number; // base: 25
  stockDemandInconsistency: number; // base: 20
  lastSaleAnomaly: number; // base: 15
  promotionSignal: number; // base: 10
}

export interface RiskThresholdsConfig {
  critical: number; // 80
  high: number; // 60
  medium: number; // 35
}

export interface SystemSettings {
  riskWeights: RiskWeightsConfig;
  riskThresholds: RiskThresholdsConfig;
  supermarketName: string;
  supermarketLocation: string;
  contactNumber: string;
  currency: 'INR';
  observationWindowDays: number;
  notificationsEnabled: boolean;
  autoAnalyzeOnImport: boolean;
  defaultStoreFilter: string;
  defaultCategoryFilter: string;
}

export interface DashboardKPIs {
  totalProductsMonitored: number;
  criticalRiskProducts: number;
  highRiskProducts: number;
  mediumRiskProducts: number;
  lowRiskProducts: number;
  openInspections: number;
  inspectionsCompletedToday: number;
  estimatedSalesAtRisk: number; // In INR sum of non-null
  confirmedDiscrepancies: number;
  confirmedFinancialLoss: number;
  dataQualityPercentage: number;
  lastAnalysisTimestamp: string | null;
}

// Detection Run & Execution Types
export type DetectionExecutionState = 'ready' | 'running' | 'success' | 'warning' | 'error';

export interface DetectionRunSummary {
  totalEvaluated: number;
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  alertsCreated: number;
  alertsUpdated: number;
  uninspectedActionableCount: number;
  recordsWithWarnings: number;
  missingPriceCount: number;
  totalSalesAtRisk: number;
  durationMs: number;
}

export interface RiskDetectionRunResponse {
  runId: string;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
  supermarketName?: string;
  storeFilter?: string;
  datasetVersion: string;
  summary: DetectionRunSummary;
  warnings: string[];
  results: RiskAnalysisResult[];
  message: string;
}

export interface RiskDetectionRunRequest {
  supermarketName?: string;
  storeId?: string; // branch filter
  weights?: RiskWeightsConfig;
  thresholds?: RiskThresholdsConfig;
  observationWindowDays?: number;
  records?: CleanedInventoryRecord[];
}

export interface DetectionRunHistoryEntry {
  runId: string;
  timestamp: string;
  supermarketName: string;
  storeFilter: string;
  totalEvaluated: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalSalesAtRisk: number;
  status: 'success' | 'warning' | 'error';
  warningsCount: number;
  alertsUpdated: number;
  message: string;
}

