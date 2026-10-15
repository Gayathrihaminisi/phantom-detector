import React, { useState } from 'react';
import {
  ClipboardList,
  Filter,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RiskBadge, StatusBadge } from '../../components/ui/Badge';
import { formatINR } from '../../utils/currencyFormatter';
import { RiskDetectionEngine } from '../../services/riskDetectionEngine';
import { RiskAnalysisResult, InspectionStatus, RiskCategory } from '../../types';
import { InspectionModal } from '../../components/inspections/InspectionModal';
import { ProductDetailDrawer } from '../../components/inventory/ProductDetailDrawer';
import { PlayCircle } from 'lucide-react';

export const Top20InspectionsPage: React.FC = () => {
  const {
    analysisResults,
    inspections,
    submitInspection,
    selectedStoreFilter,
    settings,
    runRiskDetection,
    detectionState,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [excludeResolved, setExcludeResolved] = useState<boolean>(true);

  const [inspectionTarget, setInspectionTarget] = useState<RiskAnalysisResult | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<RiskAnalysisResult | null>(null);

  // Top 20 ranking from engine using configured medium threshold
  const baseTop20 = React.useMemo(() => {
    let list = analysisResults;
    if (selectedStoreFilter !== 'ALL') {
      list = list.filter((r) => r.store_id === selectedStoreFilter);
    }
    return RiskDetectionEngine.getTop20InspectionList(
      list,
      excludeResolved,
      settings.riskThresholds.medium
    );
  }, [analysisResults, selectedStoreFilter, excludeResolved, settings.riskThresholds.medium]);

  // Categories present in dataset
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    analysisResults.forEach((r) => set.add(r.category));
    return Array.from(set).sort();
  }, [analysisResults]);

  // Filtered Top 20
  const filteredList = React.useMemo(() => {
    return baseTop20.filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesRisk = riskLevelFilter === 'ALL' || item.risk_category === riskLevelFilter;
      const matchesStatus = statusFilter === 'ALL' || item.inspection_status === statusFilter;

      return matchesSearch && matchesCategory && matchesRisk && matchesStatus;
    });
  }, [baseTop20, searchQuery, categoryFilter, riskLevelFilter, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Daily Top 20 Shelf Inspection Priorities
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
              {filteredList.length} Flagged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Algorithmically ranked by anomaly severity, baseline demand velocity, and duration of inactivity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => runRiskDetection()}
            disabled={detectionState === 'running'}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold shadow-xs transition-all ${
              detectionState === 'running'
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            <PlayCircle className={`w-3.5 h-3.5 ${detectionState === 'running' ? 'animate-spin' : ''}`} />
            <span>{detectionState === 'running' ? 'Analysing...' : 'Run Risk Detection'}</span>
          </button>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-xs cursor-pointer">
            <input
              type="checkbox"
              checked={excludeResolved}
              onChange={(e) => setExcludeResolved(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-slate-300"
            />
            <span>Exclude Resolved Items</span>
          </label>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-subtle p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Product Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Risk Level Filter */}
        <div>
          <select
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="critical">Critical Risk (80-100)</option>
            <option value="high">High Risk (60-79)</option>
            <option value="medium">Medium Risk (35-59)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Audit Statuses</option>
            <option value="pending">Pending Inspection</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="follow_up">Requires Follow-up</option>
          </select>
        </div>
      </div>

      {/* Ranked Table */}
      <div className="card-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Product & Branch</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">System Stock</th>
                <th className="py-3 px-4 text-right">Expected / Recent</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Sales at Risk (₹)</th>
                <th className="py-3 px-4 text-center">Risk Score</th>
                <th className="py-3 px-4 text-center">Audit Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                    No products matching your inspection filter criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr
                    key={`${item.store_id}_${item.product_id}`}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-black text-slate-700">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.product_id} • {item.store_location || item.store_id}
                      </div>
                      {item.detected_factors.length > 0 && (
                        <div className="text-[10px] text-red-600 font-medium mt-0.5 truncate max-w-xs">
                          {item.detected_factors[0].explanation}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{item.category}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-teal-800">
                      {item.recorded_stock} units
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="text-slate-800 font-semibold">{item.average_daily_sales} / day</div>
                      <div className={`text-[11px] ${item.recent_daily_sales === 0 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                        Recent: {item.recent_daily_sales}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {formatINR(item.selling_price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-amber-700">
                      {formatINR(item.estimated_sales_at_risk)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <RiskBadge category={item.risk_category} score={item.risk_score} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={item.inspection_status} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDrawerTarget(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="View Product Insights"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setInspectionTarget(item)}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>Inspect</span>
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
        isOpen={inspectionTarget !== null}
        onClose={() => setInspectionTarget(null)}
        product={inspectionTarget}
        onSave={(data) => {
          submitInspection(data);
          setInspectionTarget(null);
        }}
      />

      {/* Product Drawer */}
      <ProductDetailDrawer
        isOpen={drawerTarget !== null}
        onClose={() => setDrawerTarget(null)}
        product={drawerTarget}
        inspections={inspections}
        onStartInspection={(p) => {
          setDrawerTarget(null);
          setInspectionTarget(p);
        }}
      />
    </div>
  );
};
