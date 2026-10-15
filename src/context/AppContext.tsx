import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AuthState,
  ManagerProfile,
  CleanedInventoryRecord,
  DataCleaningReport,
  RiskAnalysisResult,
  RiskAlert,
  InspectionRecord,
  DashboardKPIs,
  SystemSettings,
  ImportMode,
  InspectionStatus,
  DiscrepancyType,
  ImportHistoryEntry,
  DetectionExecutionState,
  DetectionRunSummary,
  DetectionRunHistoryEntry,
} from '../types';
import { authService, DEMO_CREDENTIALS } from '../services/authService';
import { inventoryService } from '../services/inventoryService';
import { RiskDetectionEngine, DEFAULT_RISK_WEIGHTS, DEFAULT_RISK_THRESHOLDS } from '../services/riskDetectionEngine';
import { RiskDetectionService } from '../services/riskDetectionService';
import { inspectionService } from '../services/inspectionService';
import { alertService } from '../services/alertService';
import { AnalyticsService } from '../services/analyticsService';
import { CsvImportService } from '../services/csvImportService';
import { DataCleaningService } from '../services/dataCleaningService';
import { getSimulatedDataset } from '../data/simulatedSupermarketData';

const STORAGE_KEY_SETTINGS = 'phantom_stock_settings';

const DEFAULT_SETTINGS: SystemSettings = {
  riskWeights: { ...DEFAULT_RISK_WEIGHTS },
  riskThresholds: { ...DEFAULT_RISK_THRESHOLDS },
  supermarketName: 'Heritage Mart - Koramangala',
  supermarketLocation: 'Bengaluru, Karnataka',
  contactNumber: '+91 98450 12345',
  currency: 'INR',
  observationWindowDays: 7,
  notificationsEnabled: true,
  autoAnalyzeOnImport: true,
  defaultStoreFilter: 'ALL',
  defaultCategoryFilter: 'ALL',
};

interface AppContextType {
  auth: AuthState;
  settings: SystemSettings;
  inventoryRecords: CleanedInventoryRecord[];
  cleaningReport: DataCleaningReport | null;
  analysisResults: RiskAnalysisResult[];
  alerts: RiskAlert[];
  inspections: InspectionRecord[];
  dashboardKPIs: DashboardKPIs;
  isMemoryOnlyStorage: boolean;
  isAnalyzing: boolean;
  selectedStoreFilter: string;
  setSelectedStoreFilter: (store: string) => void;
  importHistory: ImportHistoryEntry[];
  canUndoImport: boolean;

  // Risk Detection Engine State (Section 2 & 3)
  detectionState: DetectionExecutionState;
  detectionMessage: string | null;
  detectionSummary: DetectionRunSummary | null;
  detectionRunHistory: DetectionRunHistoryEntry[];
  clearDetectionFeedback: () => void;

  // Actions
  registerManager: (data: {
    fullName: string;
    email: string;
    supermarketName: string;
    supermarketLocation?: string;
    contactNumber?: string;
  }) => ManagerProfile;
  loginWithDemo: () => ManagerProfile;
  login: (email: string, pass: string, rememberMe?: boolean) => ManagerProfile | null;
  logout: () => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  updateManagerProfile: (updates: Partial<ManagerProfile>) => void;
  importCSVFile: (
    file: File,
    mode?: ImportMode,
    customMapping?: Record<string, string>
  ) => Promise<{ success: boolean; errorCount: number }>;
  undoLastImport: () => { success: boolean; message: string };
  loadSimulatedDemoData: () => Promise<void>;
  runRiskDetection: (options?: { storeId?: string }) => Promise<any>;
  editInventoryRecord: (id: string, updates: Partial<CleanedInventoryRecord>) => boolean;
  updateProductPrice: (productId: string, storeId: string, newPrice: number) => boolean;
  deleteInventoryRecord: (id: string) => boolean;
  submitInspection: (data: {
    productId: string;
    productName: string;
    storeId: string;
    storeLocation?: string;
    recordedQuantity: number;
    actualShelfQuantity: number;
    shelfAvailability: 'available' | 'unavailable';
    discrepancyType: DiscrepancyType;
    notes: string;
    inspectorName?: string;
    sellingPrice: number | null;
    status?: InspectionStatus;
  }) => InspectionRecord;
  acknowledgeAlert: (alertId: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [auth, setAuth] = useState<AuthState>(() => authService.getInitialState());

  // Settings
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  // Store filter
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('ALL');

  // Core domain states
  const [inventoryRecords, setInventoryRecords] = useState<CleanedInventoryRecord[]>(() =>
    inventoryService.getRecords()
  );
  const [cleaningReport, setCleaningReport] = useState<DataCleaningReport | null>(() =>
    inventoryService.getCleaningReport()
  );
  const [inspections, setInspections] = useState<InspectionRecord[]>(() =>
    inspectionService.getInspections()
  );
  const [alerts, setAlerts] = useState<RiskAlert[]>(() => alertService.getAlerts());
  const [analysisResults, setAnalysisResults] = useState<RiskAnalysisResult[]>([]);
  const [isMemoryOnlyStorage, setIsMemoryOnlyStorage] = useState<boolean>(() =>
    inventoryService.getIsMemoryOnly()
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectionState, setDetectionState] = useState<DetectionExecutionState>('ready');
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const [detectionSummary, setDetectionSummary] = useState<DetectionRunSummary | null>(null);
  const [detectionRunHistory, setDetectionRunHistory] = useState<DetectionRunHistoryEntry[]>(() =>
    RiskDetectionService.getRunHistory()
  );
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>(() =>
    inventoryService.getImportHistory()
  );

  const clearDetectionFeedback = useCallback(() => {
    setDetectionState('ready');
    setDetectionMessage(null);
    setDetectionSummary(null);
  }, []);

  // Sync supermarket name to settings if manager registered
  useEffect(() => {
    if (auth.manager?.supermarketName && auth.manager.supermarketName !== settings.supermarketName) {
      setSettings((prev) => ({
        ...prev,
        supermarketName: auth.manager!.supermarketName,
        supermarketLocation: auth.manager!.supermarketLocation || prev.supermarketLocation,
        contactNumber: auth.manager!.contactNumber || prev.contactNumber,
      }));
    }
  }, [auth.manager]);

  // Save settings
  const updateSettings = useCallback((newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings', e);
      }
      return updated;
    });
  }, []);

  // Run risk detection engine with real execution states & central service
  const runRiskDetection = useCallback(
    async (options?: { storeId?: string }) => {
      setIsAnalyzing(true);
      setDetectionState('running');
      setDetectionMessage('Analysing inventory...');

      try {
        const currentRecords =
          inventoryRecords.length > 0 ? inventoryRecords : inventoryService.getRecords();

        const response = await RiskDetectionService.executeRun(
          {
            storeId: options?.storeId || selectedStoreFilter,
            supermarketName: settings.supermarketName,
            weights: settings.riskWeights,
            thresholds: settings.riskThresholds,
            observationWindowDays: settings.observationWindowDays,
            records: currentRecords,
          },
          settings
        );

        setAnalysisResults(response.results);
        const updatedAlerts = alertService.getAlerts();
        setAlerts(updatedAlerts);
        setDetectionSummary(response.summary);
        setDetectionMessage(response.message);
        setDetectionState(response.status);
        setDetectionRunHistory(RiskDetectionService.getRunHistory());

        return response;
      } catch (err: any) {
        const errMsg = err.message || 'Risk detection run failed.';
        setDetectionState('error');
        setDetectionMessage(errMsg);
        throw err;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [inventoryRecords, selectedStoreFilter, settings]
  );

  // Compute dashboard KPIs automatically
  const dashboardKPIs: DashboardKPIs = AnalyticsService.calculateDashboardKPIs(
    analysisResults,
    inventoryRecords,
    inspections,
    cleaningReport
  );

  // Initial load risk detection if inventory exists
  useEffect(() => {
    if (inventoryRecords.length > 0 && analysisResults.length === 0) {
      runRiskDetection();
    }
  }, [inventoryRecords.length]);

  // Auth actions
  const registerManager = useCallback(
    (data: {
      fullName: string;
      email: string;
      supermarketName: string;
      supermarketLocation?: string;
      contactNumber?: string;
    }) => {
      const profile = authService.register(data);
      setAuth({
        isAuthenticated: true,
        manager: profile,
        rememberMe: true,
        onboardingCompleted: false,
        currentOnboardingStep: 1,
      });
      setSettings((prev) => ({
        ...prev,
        supermarketName: profile.supermarketName,
        supermarketLocation: profile.supermarketLocation || prev.supermarketLocation,
        contactNumber: profile.contactNumber || prev.contactNumber,
      }));
      return profile;
    },
    []
  );

  const loginWithDemo = useCallback(() => {
    const profile = authService.loginWithDemo();
    const hasInventory = inventoryService.getRecords().length > 0;
    setAuth({
      isAuthenticated: true,
      manager: profile,
      rememberMe: true,
      onboardingCompleted: hasInventory,
      currentOnboardingStep: hasInventory ? 4 : 1,
    });
    setSettings((prev) => ({
      ...prev,
      supermarketName: profile.supermarketName,
      supermarketLocation: profile.supermarketLocation || prev.supermarketLocation,
      contactNumber: profile.contactNumber || prev.contactNumber,
    }));
    return profile;
  }, []);

  const login = useCallback((email: string, pass: string, rememberMe: boolean = true) => {
    const profile = authService.login(email, pass, rememberMe);
    if (profile) {
      const hasInventory = inventoryService.getRecords().length > 0;
      setAuth({
        isAuthenticated: true,
        manager: profile,
        rememberMe,
        onboardingCompleted: hasInventory,
        currentOnboardingStep: hasInventory ? 4 : 1,
      });
    }
    return profile;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setAuth({
      isAuthenticated: false,
      manager: null,
      rememberMe: false,
      onboardingCompleted: false,
      currentOnboardingStep: 1,
    });
  }, []);

  const setOnboardingStep = useCallback((step: number) => {
    authService.setOnboardingStep(step);
    setAuth((prev) => ({ ...prev, currentOnboardingStep: step }));
  }, []);

  const completeOnboarding = useCallback(() => {
    authService.completeOnboarding();
    setAuth((prev) => ({ ...prev, onboardingCompleted: true }));
  }, []);

  const updateManagerProfile = useCallback((updates: Partial<ManagerProfile>) => {
    const updated = authService.updateManagerProfile(updates);
    if (updated) {
      setAuth((prev) => ({ ...prev, manager: updated }));
      if (updated.supermarketName) {
        setSettings((prev) => ({ ...prev, supermarketName: updated.supermarketName }));
      }
    }
  }, []);

  // CSV Import
  const importCSVFile = useCallback(
    async (file: File, mode: ImportMode = 'replace', customMapping?: Record<string, string>) => {
      const currentRecs = mode === 'replace' ? [] : inventoryRecords;
      const rawRows = await CsvImportService.parseCsvFile(file);
      const cleanResult = DataCleaningService.cleanDataset(
        rawRows,
        settings.supermarketName,
        mode,
        currentRecs,
        customMapping
      );

      const saveRes = inventoryService.saveRecords(cleanResult.cleanedRecords);
      inventoryService.saveCleaningReport(cleanResult.report);

      // Record history
      const historyEntry: ImportHistoryEntry = {
        id: `hist_${Date.now()}`,
        filename: file.name,
        timestamp: new Date().toISOString(),
        mode,
        totalRows: cleanResult.report.totalRowsReceived,
        validAccepted: cleanResult.report.validAcceptedRecords,
        duplicates: cleanResult.report.duplicateRecordsIdentified,
        rejected: cleanResult.report.invalidRecordsRejected,
        recordsCorrected: cleanResult.report.recordsCorrected,
        dataQualityPercentage: cleanResult.report.dataQualityPercentage,
        status: 'completed',
      };
      inventoryService.addImportHistoryEntry(historyEntry);
      setImportHistory(inventoryService.getImportHistory());

      setIsMemoryOnlyStorage(!saveRes.storedInLocalStorage);
      setInventoryRecords(cleanResult.cleanedRecords);
      setCleaningReport(cleanResult.report);

      // Run risk detection immediately
      const currentInspections = inspectionService.getInspections();
      const statusMap: Record<string, InspectionStatus> = {};
      currentInspections.forEach((i) => {
        statusMap[`${i.store_id}_${i.product_id}`] = i.status;
      });
      const results = RiskDetectionEngine.analyzeInventory(
        cleanResult.cleanedRecords,
        settings.riskWeights,
        settings.riskThresholds,
        settings.observationWindowDays,
        statusMap
      );
      setAnalysisResults(results);
      setAlerts(alertService.syncAlertsFromAnalysis(results));
      inventoryService.setLastAnalysisTimestamp(new Date().toISOString());

      return {
        success: cleanResult.cleanedRecords.length > 0,
        errorCount: cleanResult.errors.length,
      };
    },
    [inventoryRecords, settings.supermarketName, settings.riskWeights, settings.riskThresholds, settings.observationWindowDays]
  );

  // Undo Last Import
  const undoLastImport = useCallback(() => {
    const result = inventoryService.undoLastImport();
    if (result.success) {
      const restored = inventoryService.getRecords();
      setInventoryRecords(restored);
      setCleaningReport(inventoryService.getCleaningReport());
      setImportHistory(inventoryService.getImportHistory());

      // Re-run risk analysis on restored dataset
      const currentInspections = inspectionService.getInspections();
      const statusMap: Record<string, InspectionStatus> = {};
      currentInspections.forEach((i) => {
        statusMap[`${i.store_id}_${i.product_id}`] = i.status;
      });
      const results = RiskDetectionEngine.analyzeInventory(
        restored,
        settings.riskWeights,
        settings.riskThresholds,
        settings.observationWindowDays,
        statusMap
      );
      setAnalysisResults(results);
      setAlerts(alertService.syncAlertsFromAnalysis(results));
    }
    return result;
  }, [settings.riskWeights, settings.riskThresholds, settings.observationWindowDays]);

  // Load Simulated Demo Data
  const loadSimulatedDemoData = useCallback(async () => {
    const rawRows = getSimulatedDataset();
    const cleanResult = DataCleaningService.cleanDataset(
      rawRows,
      settings.supermarketName,
      'replace',
      []
    );

    const saveRes = inventoryService.saveRecords(cleanResult.cleanedRecords);
    inventoryService.saveCleaningReport(cleanResult.report);

    const historyEntry: ImportHistoryEntry = {
      id: `hist_${Date.now()}`,
      filename: 'simulated_supermarket_dataset.csv',
      timestamp: new Date().toISOString(),
      mode: 'replace',
      totalRows: cleanResult.report.totalRowsReceived,
      validAccepted: cleanResult.report.validAcceptedRecords,
      duplicates: cleanResult.report.duplicateRecordsIdentified,
      rejected: cleanResult.report.invalidRecordsRejected,
      recordsCorrected: cleanResult.report.recordsCorrected,
      dataQualityPercentage: cleanResult.report.dataQualityPercentage,
      status: 'completed',
    };
    inventoryService.addImportHistoryEntry(historyEntry);
    setImportHistory(inventoryService.getImportHistory());

    setIsMemoryOnlyStorage(!saveRes.storedInLocalStorage);
    setInventoryRecords(cleanResult.cleanedRecords);
    setCleaningReport(cleanResult.report);

    // Auto analyze
    const currentInspections = inspectionService.getInspections();
    const statusMap: Record<string, InspectionStatus> = {};
    currentInspections.forEach((i) => {
      statusMap[`${i.store_id}_${i.product_id}`] = i.status;
    });
    const results = RiskDetectionEngine.analyzeInventory(
      cleanResult.cleanedRecords,
      settings.riskWeights,
      settings.riskThresholds,
      settings.observationWindowDays,
      statusMap
    );
    setAnalysisResults(results);
    setAlerts(alertService.syncAlertsFromAnalysis(results));
    inventoryService.setLastAnalysisTimestamp(new Date().toISOString());
  }, [settings.supermarketName, settings.riskWeights, settings.riskThresholds, settings.observationWindowDays]);

  // Edit / Delete Inventory Record
  const editInventoryRecord = useCallback(
    (id: string, updates: Partial<CleanedInventoryRecord>) => {
      const ok = inventoryService.updateRecord(id, updates);
      if (ok) {
        const next = inventoryService.getRecords();
        setInventoryRecords(next);
        runRiskDetection();
      }
      return ok;
    },
    [runRiskDetection]
  );

  const deleteInventoryRecord = useCallback(
    (id: string) => {
      const ok = inventoryService.deleteRecord(id);
      if (ok) {
        const next = inventoryService.getRecords();
        setInventoryRecords(next);
        runRiskDetection();
      }
      return ok;
    },
    [runRiskDetection]
  );

  // Shelf Inspection submission
  const submitInspection = useCallback(
    (data: {
      productId: string;
      productName: string;
      storeId: string;
      storeLocation?: string;
      recordedQuantity: number;
      actualShelfQuantity: number;
      shelfAvailability: 'available' | 'unavailable';
      discrepancyType: DiscrepancyType;
      notes: string;
      inspectorName?: string;
      sellingPrice: number | null;
      status?: InspectionStatus;
    }) => {
      const inspector = data.inspectorName || auth.manager?.fullName || 'Store Manager';
      const record = inspectionService.recordInspection({
        ...data,
        inspectorName: inspector,
      });

      const updatedInspections = inspectionService.getInspections();
      setInspections(updatedInspections);

      // Update alert status if corresponding alert exists
      const matchingAlert = alerts.find(
        (a) => a.product_id === data.productId && a.store_id === data.storeId
      );
      if (matchingAlert) {
        const updated = alertService.updateAlertStatus(matchingAlert.id, record.status);
        setAlerts(updated);
      }

      // Re-run detection to refresh states
      runRiskDetection();

      return record;
    },
    [auth.manager, alerts, runRiskDetection]
  );

  const acknowledgeAlert = useCallback((alertId: string) => {
    const updated = alertService.acknowledgeAlert(alertId);
    setAlerts(updated);
  }, []);

  const clearAllData = useCallback(() => {
    inventoryService.clearAll();
    setInventoryRecords([]);
    setCleaningReport(null);
    setAnalysisResults([]);
    setAlerts([]);
    inspectionService.saveInspections([]);
    setInspections([]);
    alertService.saveAlerts([]);
    setImportHistory([]);
  }, []);

  const updateProductPrice = useCallback(
    (productId: string, storeId: string, newPrice: number) => {
      const res = inventoryService.updateProductPrice(productId, storeId, newPrice);
      if (res.success) {
        const next = inventoryService.getRecords();
        setInventoryRecords(next);
        runRiskDetection().catch((e) => console.warn('Detection auto-refresh after price update', e));
        return true;
      }
      return false;
    },
    [runRiskDetection]
  );

  return (
    <AppContext.Provider
      value={{
        auth,
        settings,
        inventoryRecords,
        cleaningReport,
        analysisResults,
        alerts,
        inspections,
        dashboardKPIs,
        isMemoryOnlyStorage,
        isAnalyzing,
        selectedStoreFilter,
        setSelectedStoreFilter,
        importHistory,
        canUndoImport: inventoryService.canUndo(),
        detectionState,
        detectionMessage,
        detectionSummary,
        detectionRunHistory,
        clearDetectionFeedback,
        registerManager,
        loginWithDemo,
        login,
        logout,
        setOnboardingStep,
        completeOnboarding,
        updateManagerProfile,
        importCSVFile,
        undoLastImport,
        loadSimulatedDemoData,
        runRiskDetection,
        editInventoryRecord,
        updateProductPrice,
        deleteInventoryRecord,
        submitInspection,
        acknowledgeAlert,
        updateSettings,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
