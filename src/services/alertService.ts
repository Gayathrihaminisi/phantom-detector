import { RiskAlert, RiskAnalysisResult, InspectionStatus } from '../types';

const STORAGE_KEY_ALERTS = 'phantom_stock_alerts';

export class AlertService {
  private static instance: AlertService;

  private constructor() {}

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  public getAlerts(): RiskAlert[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ALERTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse alerts from storage', e);
    }
    return [];
  }

  public saveAlerts(alerts: RiskAlert[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
    } catch (e) {
      console.error('Failed to save alerts to storage', e);
    }
  }

  public clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_ALERTS);
    } catch (e) {
      console.error('Failed to clear alerts from storage', e);
    }
  }

  /**
   * Sync analysis results with alerts list without creating duplicates on repeated runs.
   * Returns updated alerts along with counts of created and updated alerts.
   */
  public syncAlertsDetailed(
    analysisResults: RiskAnalysisResult[],
    mediumThreshold: number = 25
  ): { alerts: RiskAlert[]; alertsCreated: number; alertsUpdated: number } {
    const existingAlerts = this.getAlerts();
    const alertMap = new Map<string, RiskAlert>();
    let alertsCreated = 0;
    let alertsUpdated = 0;

    // Map existing alerts by product_id + store_id
    existingAlerts.forEach((a) => {
      alertMap.set(`${a.store_id}_${a.product_id}`, a);
    });

    // Only products with medium, high, or critical risk create/update alerts
    analysisResults.forEach((res) => {
      if (res.risk_score >= mediumThreshold) {
        const key = `${res.store_id}_${res.product_id}`;
        const existing = alertMap.get(key);

        const anomalyTitle =
          res.detected_factors.length > 0
            ? res.detected_factors.map((f) => f.name).join(' & ')
            : 'Suspected Phantom Stock-Out';

        if (existing) {
          alertsUpdated++;
          // Update score and details, preserve acknowledgment and inspection status unless resolved
          alertMap.set(key, {
            ...existing,
            risk_level: res.risk_category,
            risk_score: res.risk_score,
            detected_anomaly: anomalyTitle,
            explanation: res.human_readable_explanation,
            recommended_action: res.recommended_action,
            inspection_status: res.inspection_status || existing.inspection_status,
          });
        } else {
          alertsCreated++;
          // Create new alert
          const newAlert: RiskAlert = {
            id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: res.product_id,
            product_name: res.product_name,
            store_id: res.store_id,
            store_location: res.store_location,
            risk_level: res.risk_category,
            risk_score: res.risk_score,
            alert_date: res.date || new Date().toISOString().split('T')[0],
            detected_anomaly: anomalyTitle,
            explanation: res.human_readable_explanation,
            recommended_action: res.recommended_action,
            inspection_status: res.inspection_status || 'pending',
            acknowledged: false,
          };
          alertMap.set(key, newAlert);
        }
      }
    });

    const updatedAlerts = Array.from(alertMap.values()).sort(
      (a, b) => b.risk_score - a.risk_score
    );

    this.saveAlerts(updatedAlerts);
    return { alerts: updatedAlerts, alertsCreated, alertsUpdated };
  }

  /**
   * Sync analysis results with alerts list without creating duplicates on repeated runs
   */
  public syncAlertsFromAnalysis(
    analysisResults: RiskAnalysisResult[],
    mediumThreshold: number = 25
  ): RiskAlert[] {
    return this.syncAlertsDetailed(analysisResults, mediumThreshold).alerts;
  }

  public acknowledgeAlert(alertId: string): RiskAlert[] {
    const alerts = this.getAlerts();
    const updated = alerts.map((a) =>
      a.id === alertId
        ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
        : a
    );
    this.saveAlerts(updated);
    return updated;
  }

  public updateAlertStatus(
    alertId: string,
    status: InspectionStatus
  ): RiskAlert[] {
    const alerts = this.getAlerts();
    const updated = alerts.map((a) =>
      a.id === alertId ? { ...a, inspection_status: status } : a
    );
    this.saveAlerts(updated);
    return updated;
  }
}

export const alertService = AlertService.getInstance();
