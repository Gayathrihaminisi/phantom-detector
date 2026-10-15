import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Sparkles,
  PlayCircle,
  Database,
  ArrowRight,
  ExternalLink,
  Store,
  Layers,
  Clock,
  Eye,
  X,
  RefreshCw,
  History,
  Plus,
  Edit3,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { RiskBadge, StatusBadge, Badge } from '../../components/ui/Badge';
import { formatINR, formatCompactINR } from '../../utils/currencyFormatter';
import { AnalyticsService } from '../../services/analyticsService';
import { RiskDetectionEngine } from '../../services/riskDetectionEngine';
import { RiskAnalysisResult } from '../../types';
import { InspectionModal } from '../../components/inspections/InspectionModal';
import { ProductDetailDrawer } from '../../components/inventory/ProductDetailDrawer';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    settings,
    inventoryRecords,
    analysisResults,
    alerts,
    inspections,
    dashboardKPIs,
    cleaningReport,
    runRiskDetection,
    isAnalyzing,
    detectionState,
    detectionMessage,
    detectionSummary,
    detectionRunHistory,
    clearDetectionFeedback,
    updateProductPrice,
    selectedStoreFilter,
    submitInspection,
  } = useApp();

  // State for Inspection Modal & Product Drawer
  const [selectedProductForInspection, setSelectedProductForInspection] = useState<RiskAnalysisResult | null>(null);
  const [selectedProductForDrawer, setSelectedProductForDrawer] = useState<RiskAnalysisResult | null>(null);

  // Run History Modal & Missing Price Remediation states
  const [showRunHistoryModal, setShowRunHistoryModal] = useState(false);
  const [showMissingPricesRemediation, setShowMissingPricesRemediation] = useState(false);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [inputPriceValue, setInputPriceValue] = useState<string>('');

  // Filter results if a store is selected
  const filteredAnalysis = React.useMemo(() => {
    if (selectedStoreFilter === 'ALL') return analysisResults;
    return analysisResults.filter((r) => r.store_id === selectedStoreFilter);
  }, [analysisResults, selectedStoreFilter]);

  // Top 20 Priority Items
  const top20Priorities = React.useMemo(() => {
    return RiskDetectionEngine.getTop20InspectionList(filteredAnalysis, false);
  }, [filteredAnalysis]);

  // Chart Data
  const riskCategoryData = React.useMemo(() => {
    return AnalyticsService.getRiskCategoryBreakdown(filteredAnalysis);
  }, [filteredAnalysis]);

  const categoryRiskData = React.useMemo(() => {
    return AnalyticsService.getCategoryRiskBreakdown(filteredAnalysis).slice(0, 6);
  }, [filteredAnalysis]);

  const revenueTrendData = React.useMemo(() => {
    return AnalyticsService.getRevenueTrendByDate(inventoryRecords).slice(-7);
  }, [inventoryRecords]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Store Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold uppercase tracking-wider border border-teal-500/30">
              Operational Status
            </span>
            <span className="text-xs text-slate-400">
              Store: {settings.supermarketName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Supermarket Inventory Risk Monitor
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Continuously analyzing sales velocity vs book inventory to uncover phantom stock-outs, reduce revenue leakage, and prioritize physical shelf audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            onClick={() => setShowRunHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-semibold shadow-xs transition-all"
            title="View detection run history and audit log"
          >
            <History className="w-3.5 h-3.5 text-teal-400" />
            <span>Runs ({detectionRunHistory.length})</span>
          </button>

          <button
            onClick={() => runRiskDetection()}
            disabled={detectionState === 'running'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              detectionState === 'running'
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : detectionState === 'error'
                ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white'
                : 'bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950'
            }`}
          >
            <PlayCircle className={`w-4 h-4 ${detectionState === 'running' ? 'animate-spin' : ''}`} />
            <span>
              {detectionState === 'running'
                ? 'Analysing inventory...'
                : detectionState === 'error'
                ? 'Retry Risk Engine'
                : 'Run Risk Engine'}
            </span>
          </button>
        </div>
      </div>

      {/* Detection Execution Banner (Section 3: Ready, Running, Success, Warning, Error) */}
      {detectionState === 'running' && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center justify-between gap-3 shadow-xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
            <div>
              <span className="font-bold">Executing Risk Detection Engine...</span>
              <p className="text-[11px] text-teal-700 mt-0.5">
                Evaluating sales velocity, historical baselines, closing stock, and inactivity across all store branches.
              </p>
            </div>
          </div>
        </div>
      )}

      {detectionState === 'success' && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">Risk Detection Completed Successfully</span>
                {detectionSummary && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {detectionSummary.durationMs}ms
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {detectionMessage}
              </p>
              {detectionSummary && (
                <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-200/60 font-semibold text-emerald-950">
                    {detectionSummary.totalEvaluated} Products Evaluated
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-100 font-semibold text-red-800">
                    {detectionSummary.criticalRiskCount} Critical Risk
                  </span>
                  <span className="px-2 py-0.5 rounded bg-orange-100 font-semibold text-orange-800">
                    {detectionSummary.highRiskCount} High Risk
                  </span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 font-semibold text-teal-800">
                    {detectionSummary.alertsCreated} New Alerts
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 font-semibold text-slate-800">
                    {detectionSummary.alertsUpdated} Alerts Synchronized
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={clearDetectionFeedback}
            className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {detectionState === 'warning' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold">Risk Detection Completed with Data Warnings</span>
                {detectionSummary && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                    {detectionSummary.missingPriceCount} Missing Prices
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                {detectionMessage}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => setShowMissingPricesRemediation((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                >
                  {showMissingPricesRemediation ? 'Hide Price Remediation' : 'Remediate Missing Prices'}
                </button>
                <button
                  onClick={() => navigate('/csv-upload')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60 font-semibold text-[11px] transition-colors"
                >
                  Upload Corrected CSV
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={clearDetectionFeedback}
            className="p-1 rounded-md text-amber-700 hover:bg-amber-100 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {detectionState === 'error' && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-xs text-red-950 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-bold text-red-900">Detection Engine Execution Halted</span>
              <p className="text-[11px] text-red-800 leading-relaxed">
                {detectionMessage || 'Upload a valid dataset before running risk detection.'}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => navigate('/csv-upload')}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                >
                  Go to CSV Upload
                </button>
                <button
                  onClick={() => runRiskDetection()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-900 hover:bg-red-50 font-semibold text-[11px] transition-colors"
                >
                  Retry Execution
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={clearDetectionFeedback}
            className="p-1 rounded-md text-red-700 hover:bg-red-100 transition-colors"
            title="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Missing Price Remediation Section (Section 6) */}
      {(showMissingPricesRemediation ||
        inventoryRecords.some((r) => r.selling_price === null)) && (
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h3 className="text-sm font-bold text-slate-900">
                  Missing Selling Prices Remediation ({inventoryRecords.filter((r) => r.selling_price === null).length} Products)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Price missing — financial exposure unavailable
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rules A (Zero Sales), B (Slowdown), C (Disparity), and D (Inactivity) evaluate normally. Enter unit selling prices below to calculate Estimated Sales at Risk (₹).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/csv-upload')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Upload CSV with Prices
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold">SKU / ID</th>
                  <th className="py-2 px-3 font-semibold">Product Name</th>
                  <th className="py-2 px-3 font-semibold">Branch</th>
                  <th className="py-2 px-3 font-semibold">Category</th>
                  <th className="py-2 px-3 font-semibold">Stock</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold text-right">Selling Price (₹)</th>
                  <th className="py-2 px-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryRecords
                  .filter((r) => r.selling_price === null)
                  .map((item) => (
                    <tr key={`${item.store_id}_${item.product_id}`} className="hover:bg-amber-50/30">
                      <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-700">
                        {item.product_id}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {item.product_name}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.store_id}</td>
                      <td className="py-2 px-3 text-slate-600">{item.category}</td>
                      <td className="py-2 px-3 text-slate-700 font-bold">{item.recorded_closing_stock}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Unavailable
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {editingPriceProductId === `${item.store_id}_${item.product_id}` ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              min="1"
                              step="0.5"
                              value={inputPriceValue}
                              onChange={(e) => setInputPriceValue(e.target.value)}
                              placeholder="Price"
                              className="w-20 px-2 py-1 border border-teal-500 rounded text-xs font-bold text-slate-900 focus:outline-none"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not specified</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {editingPriceProductId === `${item.store_id}_${item.product_id}` ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                const p = parseFloat(inputPriceValue);
                                if (!isNaN(p) && p > 0) {
                                  updateProductPrice(item.product_id, item.store_id, p);
                                  setEditingPriceProductId(null);
                                  setInputPriceValue('');
                                }
                              }}
                              className="px-2 py-1 rounded bg-teal-600 text-white font-bold text-[10px] hover:bg-teal-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingPriceProductId(null);
                                setInputPriceValue('');
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPriceProductId(`${item.store_id}_${item.product_id}`);
                              setInputPriceValue('');
                            }}
                            className="flex items-center gap-1 mx-auto px-2 py-1 rounded bg-teal-50 text-teal-700 font-bold text-[10px] hover:bg-teal-100 border border-teal-200"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Price</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Provenance & Freshness Bar (Section 8.8) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>Active Dataset:</strong>{' '}
            {cleaningReport
              ? `${cleaningReport.supermarketName} (${cleaningReport.validAcceptedRecords} items • Quality: ${cleaningReport.dataQualityPercentage}%)`
              : `${settings.supermarketName} (${inventoryRecords.length} items)`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Last Imported:{' '}
              <strong className="text-slate-700">
                {cleaningReport
                  ? new Date(cleaningReport.importTimestamp).toLocaleString('en-IN')
                  : 'Pre-loaded Demo'}
              </strong>
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>
              Risk Engine Status:{' '}
              <strong className="text-emerald-700">
                {dashboardKPIs.lastAnalysisTimestamp
                  ? `Evaluated ${new Date(dashboardKPIs.lastAnalysisTimestamp).toLocaleTimeString('en-IN')}`
                  : 'Synchronized'}
              </strong>
            </span>
          </span>
        </div>
      </div>

      {/* 8 Primary KPI Cards (Section 10.1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {/* Total Monitored */}
        <div className="card-subtle p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Monitored Items</span>
            <Database className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {dashboardKPIs.totalProductsMonitored}
            </span>
            <span className="text-[10px] text-slate-500">active SKUs</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">POS & Inventory Records</p>
        </div>

        {/* Critical Risk */}
        <div className="card-subtle p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Critical Risk</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600">
              {dashboardKPIs.criticalRiskProducts}
            </span>
            <span className="text-[10px] text-red-500 font-semibold">Immediate Audit</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">High probability phantom stock-out</p>
        </div>

        {/* High Risk */}
        <div className="card-subtle p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between text-orange-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">High Risk</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-600">
              {dashboardKPIs.highRiskProducts}
            </span>
            <span className="text-[10px] text-orange-500 font-semibold">Today's Inspection</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Severe sales slowdown detected</p>
        </div>

        {/* Estimated Sales At Risk */}
        <div className="card-subtle p-4 border-l-4 border-l-amber-500 bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estimated Sales at Risk</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-amber-900 truncate" title={formatINR(dashboardKPIs.estimatedSalesAtRisk)}>
              {formatINR(dashboardKPIs.estimatedSalesAtRisk)}
            </span>
          </div>
          <p className="text-[10px] text-amber-700 mt-1">Potential demand gap in ₹</p>
        </div>

        {/* Confirmed Discrepancies */}
        <div className="card-subtle p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified Discrepancies</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-800">
              {dashboardKPIs.confirmedDiscrepancies}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">Audit Proven</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Confirmed by physical shelf audit</p>
        </div>

        {/* Confirmed Financial Loss */}
        <div className="card-subtle p-4">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Confirmed Loss (₹)</span>
            <TrendingDown className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 truncate" title={formatINR(dashboardKPIs.confirmedFinancialLoss)}>
              {formatINR(dashboardKPIs.confirmedFinancialLoss)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Physical shortage loss in ₹</p>
        </div>

        {/* Open Inspections */}
        <div className="card-subtle p-4">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Open Inspections</span>
            <ClipboardList className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {dashboardKPIs.openInspections}
            </span>
            <span className="text-[10px] text-slate-500">pending resolution</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {dashboardKPIs.inspectionsCompletedToday} completed today
          </p>
        </div>

        {/* Data Quality */}
        <div className="card-subtle p-4">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Data Quality</span>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700">
              {dashboardKPIs.dataQualityPercentage}%
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">Cleaned</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">POS schema validation passed</p>
        </div>
      </div>

      {/* Visual Analytics Charts (Section 10.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Donut */}
        <div className="card-subtle p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Risk Classification Breakdown
              </h3>
              <p className="text-[11px] text-slate-400">Distribution of evaluated inventory</p>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {filteredAnalysis.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No inventory analyzed yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskCategoryData}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} Products`, name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Estimated Sales At Risk By Category (INR) */}
        <div className="card-subtle p-5 flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Estimated Sales at Risk by Category (₹)
              </h3>
              <p className="text-[11px] text-slate-400">Potential monetary revenue exposed per category</p>
            </div>
          </div>

          <div className="h-56 w-full">
            {categoryRiskData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No risk data available to chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryRiskData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tickFormatter={(val) => formatCompactINR(val)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val)), 'Sales at Risk']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                  <Bar dataKey="salesAtRisk" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Estimated Sales at Risk" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top 20 Inspection Priorities Table Preview (Section 10.3 & 12) */}
      <div className="card-subtle overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Top Priority Shelf Inspection List
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Ranked by Risk Score
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Identified products with positive book stock but zero/diminished sales activity.
            </p>
          </div>
          <button
            onClick={() => navigate('/inspections/top20')}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
          >
            <span>View Full Top 20</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">System Stock</th>
                <th className="py-3 px-4 text-right">Recent Sales</th>
                <th className="py-3 px-4 text-right">Price (₹)</th>
                <th className="py-3 px-4 text-right">Sales at Risk (₹)</th>
                <th className="py-3 px-4 text-center">Risk Score</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top20Priorities.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No high-risk inventory discrepancies flagged at this time.
                  </td>
                </tr>
              ) : (
                top20Priorities.slice(0, 5).map((item, idx) => (
                  <tr key={`${item.store_id}_${item.product_id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.product_id} • {item.store_location || item.store_id}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.category}</td>
                    <td className="py-3 px-4 text-right font-semibold text-teal-800">
                      {item.recorded_stock} units
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600">
                      {item.recent_daily_sales} / day
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {formatINR(item.selling_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-700">
                      {formatINR(item.estimated_sales_at_risk)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RiskBadge category={item.risk_category} score={item.risk_score} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedProductForDrawer(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="View detailed product analytics"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedProductForInspection(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      <InspectionModal
        isOpen={selectedProductForInspection !== null}
        onClose={() => setSelectedProductForInspection(null)}
        product={selectedProductForInspection}
        onSave={(data) => {
          submitInspection(data);
          setSelectedProductForInspection(null);
        }}
      />

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        isOpen={selectedProductForDrawer !== null}
        onClose={() => setSelectedProductForDrawer(null)}
        product={selectedProductForDrawer}
        inspections={inspections}
        onStartInspection={(p) => {
          setSelectedProductForDrawer(null);
          setSelectedProductForInspection(p);
        }}
      />

      {/* Detection Run History Modal (Section 9 & 10) */}
      {showRunHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Risk Engine Detection Run History & Audit Trail
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological audit log of all risk detection evaluations and outcomes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRunHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {detectionRunHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No detection runs recorded yet. Click "Run Risk Engine" to execute an evaluation.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Run ID</th>
                        <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                        <th className="py-2.5 px-3 font-semibold">Branch Filter</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Evaluated</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Critical</th>
                        <th className="py-2.5 px-3 font-semibold text-center">High</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Exposure (₹)</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detectionRunHistory.map((run) => (
                        <tr key={run.runId} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-700">
                            {run.runId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {new Date(run.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {run.storeFilter}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {run.totalEvaluated}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-red-600">
                            {run.criticalCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-orange-600">
                            {run.highCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-900">
                            {formatINR(run.totalSalesAtRisk)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                run.status === 'success'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : run.status === 'warning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {run.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowRunHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
