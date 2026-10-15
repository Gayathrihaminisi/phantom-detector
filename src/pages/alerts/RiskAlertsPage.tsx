import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Check,
  ClipboardList,
  Clock,
  ArrowRight,
  ShieldAlert,
  Building2,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RiskBadge, StatusBadge } from '../../components/ui/Badge';
import { RiskAlert, InspectionStatus } from '../../types';
import { InspectionModal } from '../../components/inspections/InspectionModal';

export const RiskAlertsPage: React.FC = () => {
  const {
    alerts,
    analysisResults,
    acknowledgeAlert,
    submitInspection,
    selectedStoreFilter,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ackFilter, setAckFilter] = useState('ALL');

  const [inspectionTarget, setInspectionTarget] = useState<RiskAlert | null>(null);

  // Filtered alerts
  const filteredAlerts = React.useMemo(() => {
    return alerts.filter((alert) => {
      if (selectedStoreFilter !== 'ALL' && alert.store_id !== selectedStoreFilter) {
        return false;
      }

      const matchSearch =
        alert.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.product_id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRisk = riskFilter === 'ALL' || alert.risk_level === riskFilter;
      const matchStatus = statusFilter === 'ALL' || alert.inspection_status === statusFilter;
      const matchAck =
        ackFilter === 'ALL'
          ? true
          : ackFilter === 'ACK'
          ? alert.acknowledged
          : !alert.acknowledged;

      return matchSearch && matchRisk && matchStatus && matchAck;
    });
  }, [alerts, selectedStoreFilter, searchQuery, riskFilter, statusFilter, ackFilter]);

  // Find corresponding analysis result for inspection modal
  const targetAnalysisItem = React.useMemo(() => {
    if (!inspectionTarget) return null;
    return (
      analysisResults.find(
        (r) =>
          r.product_id === inspectionTarget.product_id &&
          r.store_id === inspectionTarget.store_id
      ) || null
    );
  }, [inspectionTarget, analysisResults]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Inventory Discrepancy Risk Alerts
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold">
              {filteredAlerts.length} Active Alerts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            System generated discrepancy warnings from sudden zero sales, inventory velocity stalls, and demand gaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Unacknowledged: <strong>{alerts.filter((a) => !a.acknowledged).length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-subtle p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Inspection Statuses</option>
            <option value="pending">Pending Inspection</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="follow_up">Follow-up Required</option>
          </select>
        </div>

        <div>
          <select
            value={ackFilter}
            onChange={(e) => setAckFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Acknowledgment States</option>
            <option value="UNACK">Unacknowledged Only</option>
            <option value="ACK">Acknowledged</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="card-subtle p-12 text-center text-slate-400 italic">
            No risk discrepancy alerts found matching filter criteria.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`card-subtle p-5 transition-all border-l-4 ${
                alert.risk_level === 'critical'
                  ? 'border-l-red-500 bg-red-50/10'
                  : alert.risk_level === 'high'
                  ? 'border-l-orange-500 bg-orange-50/10'
                  : 'border-l-amber-500 bg-amber-50/10'
              } ${alert.acknowledged ? 'opacity-85' : 'ring-1 ring-teal-500/10'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RiskBadge category={alert.risk_level} score={alert.risk_score} />
                    <StatusBadge status={alert.inspection_status} />
                    {alert.acknowledged ? (
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Acknowledged
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        New Alert
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      Date: {alert.alert_date}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {alert.product_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    SKU: {alert.product_id} • Branch: {alert.store_location || alert.store_id}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-slate-500" />
                      <span>Acknowledge</span>
                    </button>
                  )}
                  <button
                    onClick={() => setInspectionTarget(alert)}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Perform Inspection</span>
                  </button>
                </div>
              </div>

              {/* Anomaly & Explanation */}
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Detected Anomaly
                  </span>
                  <p className="font-semibold text-slate-800">{alert.detected_anomaly}</p>
                  <p className="text-[11px] text-slate-600 mt-1">{alert.explanation}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block mb-0.5">
                    Recommended Action
                  </span>
                  <p className="font-bold text-teal-950">{alert.recommended_action}</p>
                  <p className="text-[11px] text-teal-800 mt-1">
                    Send floor supervisor to verify shelf facing, count actual units, and resolve book discrepancy.
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inspection Modal */}
      {targetAnalysisItem && (
        <InspectionModal
          isOpen={inspectionTarget !== null}
          onClose={() => setInspectionTarget(null)}
          product={targetAnalysisItem}
          onSave={(data) => {
            submitInspection(data);
            setInspectionTarget(null);
          }}
        />
      )}
    </div>
  );
};
