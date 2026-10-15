import { InspectionRecord, DiscrepancyType, InspectionStatus } from '../types';

const STORAGE_KEY_INSPECTIONS = 'phantom_stock_inspections';

export class InspectionService {
  private static instance: InspectionService;

  private constructor() {}

  public static getInstance(): InspectionService {
    if (!InspectionService.instance) {
      InspectionService.instance = new InspectionService();
    }
    return InspectionService.instance;
  }

  public getInspections(): InspectionRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INSPECTIONS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load inspections from storage', e);
    }
    return [];
  }

  public saveInspections(inspections: InspectionRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_INSPECTIONS, JSON.stringify(inspections));
    } catch (e) {
      console.error('Failed to save inspections to storage', e);
    }
  }

  public clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_INSPECTIONS);
    } catch (e) {
      console.error('Failed to clear inspections from storage', e);
    }
  }

  public recordInspection(data: {
    productId: string;
    productName: string;
    storeId: string;
    storeLocation?: string;
    recordedQuantity: number;
    actualShelfQuantity: number;
    shelfAvailability: 'available' | 'unavailable';
    discrepancyType: DiscrepancyType;
    notes: string;
    inspectorName: string;
    sellingPrice: number | null;
    status?: InspectionStatus;
  }): InspectionRecord {
    const isDiscrepancyVerified =
      data.shelfAvailability === 'unavailable' ||
      data.actualShelfQuantity < data.recordedQuantity ||
      data.discrepancyType !== 'none_stock_present';

    // Calculate confirmed financial loss only if physical discrepancy is verified and price is valid
    let confirmedLoss: number | null = null;
    if (isDiscrepancyVerified && data.sellingPrice !== null && data.sellingPrice > 0) {
      const missingUnits = Math.max(0, data.recordedQuantity - data.actualShelfQuantity);
      confirmedLoss = parseFloat((missingUnits * data.sellingPrice).toFixed(2));
    }

    const record: InspectionRecord = {
      id: `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      product_id: data.productId,
      product_name: data.productName,
      store_id: data.storeId,
      store_location: data.storeLocation,
      recorded_quantity: data.recordedQuantity,
      actual_shelf_quantity: data.actualShelfQuantity,
      shelf_availability: data.shelfAvailability,
      discrepancy_type: data.discrepancyType,
      notes: data.notes.trim(),
      timestamp: new Date().toISOString(),
      inspector_name: data.inspectorName || 'Store Manager',
      verified_discrepancy: isDiscrepancyVerified,
      confirmed_financial_loss: confirmedLoss,
      status: data.status || 'resolved',
    };

    const existing = this.getInspections();
    const updated = [record, ...existing];
    this.saveInspections(updated);

    return record;
  }

  public updateInspectionStatus(inspectionId: string, status: InspectionStatus): InspectionRecord[] {
    const existing = this.getInspections();
    const updated = existing.map((i) => (i.id === inspectionId ? { ...i, status } : i));
    this.saveInspections(updated);
    return updated;
  }
}

export const inspectionService = InspectionService.getInstance();
