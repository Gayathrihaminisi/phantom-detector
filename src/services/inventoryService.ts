import { CleanedInventoryRecord, DataCleaningReport, ImportHistoryEntry } from '../types';

const STORAGE_KEY_INVENTORY = 'phantom_stock_inventory_records';
const STORAGE_KEY_REPORT = 'phantom_stock_cleaning_report';
const STORAGE_KEY_ANALYSIS_TIME = 'phantom_stock_last_analysis_timestamp';
const STORAGE_KEY_HISTORY = 'phantom_stock_import_history';
const STORAGE_KEY_PREVIOUS_INVENTORY = 'phantom_stock_prev_inventory_records';
const STORAGE_KEY_PREVIOUS_REPORT = 'phantom_stock_prev_cleaning_report';

export class InventoryService {
  private static instance: InventoryService;
  private memoryRecords: CleanedInventoryRecord[] = [];
  private previousMemoryRecords: CleanedInventoryRecord[] | null = null;
  private previousReport: DataCleaningReport | null = null;
  private isMemoryOnly: boolean = false;

  private constructor() {}

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  public getRecords(): CleanedInventoryRecord[] {
    if (this.memoryRecords.length > 0) {
      return this.memoryRecords;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY_INVENTORY);
      if (stored) {
        this.memoryRecords = JSON.parse(stored);
        return this.memoryRecords;
      }
    } catch (e) {
      console.warn('Failed to load inventory from localStorage, using memory storage', e);
    }
    return [];
  }

  public saveRecords(records: CleanedInventoryRecord[]): { storedInLocalStorage: boolean } {
    // Preserve current state for undo
    this.preserveUndoState();

    this.memoryRecords = records;

    try {
      const serialized = JSON.stringify(records);
      localStorage.setItem(STORAGE_KEY_INVENTORY, serialized);
      this.isMemoryOnly = false;
      return { storedInLocalStorage: true };
    } catch (e) {
      console.warn('LocalStorage quota exceeded or unavailable. Retaining in session memory.', e);
      this.isMemoryOnly = true;
      return { storedInLocalStorage: false };
    }
  }

  private preserveUndoState(): void {
    const currentRecords = this.getRecords();
    const currentReport = this.getCleaningReport();
    if (currentRecords.length > 0) {
      this.previousMemoryRecords = [...currentRecords];
      this.previousReport = currentReport ? { ...currentReport } : null;
      try {
        localStorage.setItem(STORAGE_KEY_PREVIOUS_INVENTORY, JSON.stringify(currentRecords));
        if (currentReport) {
          localStorage.setItem(STORAGE_KEY_PREVIOUS_REPORT, JSON.stringify(currentReport));
        }
      } catch (e) {
        console.warn('Failed to persist undo state in storage', e);
      }
    }
  }

  public canUndo(): boolean {
    if (this.previousMemoryRecords !== null) return true;
    try {
      return localStorage.getItem(STORAGE_KEY_PREVIOUS_INVENTORY) !== null;
    } catch {
      return false;
    }
  }

  public undoLastImport(): { success: boolean; message: string } {
    let restoredRecords: CleanedInventoryRecord[] | null = this.previousMemoryRecords;
    let restoredReport: DataCleaningReport | null = this.previousReport;

    if (!restoredRecords) {
      try {
        const storedPrev = localStorage.getItem(STORAGE_KEY_PREVIOUS_INVENTORY);
        if (storedPrev) {
          restoredRecords = JSON.parse(storedPrev);
        }
        const storedPrevReport = localStorage.getItem(STORAGE_KEY_PREVIOUS_REPORT);
        if (storedPrevReport) {
          restoredReport = JSON.parse(storedPrevReport);
        }
      } catch (e) {
        console.warn('Failed to restore undo state from storage', e);
      }
    }

    if (!restoredRecords) {
      return { success: false, message: 'No previous dataset state available to undo.' };
    }

    this.memoryRecords = restoredRecords;
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(restoredRecords));
      if (restoredReport) {
        localStorage.setItem(STORAGE_KEY_REPORT, JSON.stringify(restoredReport));
      } else {
        localStorage.removeItem(STORAGE_KEY_REPORT);
      }
      localStorage.removeItem(STORAGE_KEY_PREVIOUS_INVENTORY);
      localStorage.removeItem(STORAGE_KEY_PREVIOUS_REPORT);
    } catch (e) {
      console.warn('Failed to write restored dataset to storage', e);
    }

    this.previousMemoryRecords = null;
    this.previousReport = null;

    // Mark last history entry as undone
    const history = this.getImportHistory();
    if (history.length > 0) {
      history[0].status = 'undone';
      this.saveImportHistory(history);
    }

    return {
      success: true,
      message: `Successfully undone latest import. Restored ${restoredRecords.length} previous inventory records.`,
    };
  }

  public updateRecord(id: string, updates: Partial<CleanedInventoryRecord>): boolean {
    const records = this.getRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return false;

    records[index] = { ...records[index], ...updates };
    this.saveRecords(records);
    return true;
  }

  public deleteRecord(id: string): boolean {
    const records = this.getRecords();
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) return false;

    this.saveRecords(filtered);
    return true;
  }

  public getCleaningReport(): DataCleaningReport | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REPORT);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  public saveCleaningReport(report: DataCleaningReport): void {
    try {
      localStorage.setItem(STORAGE_KEY_REPORT, JSON.stringify(report));
    } catch (e) {
      console.warn('Failed to save cleaning report to storage', e);
    }
  }

  public getLastAnalysisTimestamp(): string | null {
    return localStorage.getItem(STORAGE_KEY_ANALYSIS_TIME);
  }

  public setLastAnalysisTimestamp(timestamp: string): void {
    localStorage.setItem(STORAGE_KEY_ANALYSIS_TIME, timestamp);
  }

  public getImportHistory(): ImportHistoryEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public addImportHistoryEntry(entry: ImportHistoryEntry): void {
    const history = this.getImportHistory();
    const updated = [entry, ...history].slice(0, 20); // Keep last 20
    this.saveImportHistory(updated);
  }

  private saveImportHistory(history: ImportHistoryEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save import history to storage', e);
    }
  }

  public updateProductPrice(
    productId: string,
    storeId: string,
    newPrice: number
  ): { success: boolean; updatedRecord?: CleanedInventoryRecord } {
    const records = [...this.getRecords()];
    const index = records.findIndex((r) => r.product_id === productId && r.store_id === storeId);
    if (index === -1) {
      return { success: false };
    }
    const updated = { ...records[index], selling_price: newPrice };
    records[index] = updated;
    this.saveRecords(records);
    return { success: true, updatedRecord: updated };
  }

  public getDetectionRunHistory(): any[] {
    try {
      const stored = localStorage.getItem('phantom_stock_detection_runs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public saveDetectionRun(entry: any): void {
    const history = this.getDetectionRunHistory();
    const updated = [entry, ...history].slice(0, 30); // Keep last 30 runs
    try {
      localStorage.setItem('phantom_stock_detection_runs', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save detection run to storage', e);
    }
  }

  public getIsMemoryOnly(): boolean {
    return this.isMemoryOnly;
  }

  public clearAll(): void {
    this.memoryRecords = [];
    this.previousMemoryRecords = null;
    this.previousReport = null;
    this.isMemoryOnly = false;
    localStorage.removeItem(STORAGE_KEY_INVENTORY);
    localStorage.removeItem(STORAGE_KEY_REPORT);
    localStorage.removeItem(STORAGE_KEY_ANALYSIS_TIME);
    localStorage.removeItem(STORAGE_KEY_PREVIOUS_INVENTORY);
    localStorage.removeItem(STORAGE_KEY_PREVIOUS_REPORT);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem('phantom_stock_detection_runs');
  }
}

export const inventoryService = InventoryService.getInstance();
