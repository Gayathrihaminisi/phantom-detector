import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatINR, formatCompactINR } from '../../utils/currencyFormatter';
import { AnalyticsService } from '../../services/analyticsService';
import { CsvImportService } from '../../services/csvImportService';

export const AnalyticsPage: React.FC = () => {
  const {
    inventoryRecords,
    analysisResults,
    alerts,
    inspections,
    dashboardKPIs,
    selectedStoreFilter,
  } = useApp();

  const [dateFilter, setDateFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    analysisResults.forEach((r) => set.add(r.category));
    return Array.from(set).sort();
  }, [analysisResults]);

  // Filtered records
  const filteredRecords = React.useMemo(() => {
    return inventoryRecords.filter((r) => {
      if (selectedStoreFilter !== 'ALL' && r.store_id !== selectedStoreFilter) return false;
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      return true;
    });
  }, [inventoryRecords, selectedStoreFilter, categoryFilter]);

  // Chart data
  const revenueTrends = React.useMemo(() => {
    return AnalyticsService.getRevenueTrendByDate(filteredRecords);
  }, [filteredRecords]);

  const categoryRiskStats = React.useMemo(() => {
    return AnalyticsService.getCategoryRiskBreakdown(analysisResults);
  }, [analysisResults]);

  const storeComparisons = React.useMemo(() => {
    return AnalyticsService.getStoreComparison(analysisResults, inventoryRecords);
  }, [analysisResults, inventoryRecords]);

  // Financial summary data for category table
  const categoryFinancialSummary = React.useMemo(() => {
    const map = new Map<string, { recordedRevenue: number; estimatedSalesAtRisk: number; confirmedLoss: number }>();

    inventoryRecords.forEach((r) => {
      const cat = r.category || 'General';
      if (!map.has(cat)) map.set(cat, { recordedRevenue: 0, estimatedSalesAtRisk: 0, confirmedLoss: 0 });
      const entry = map.get(cat)!;
      if (r.selling_price !== null) {
        entry.recordedRevenue += r.units_sold * r.selling_price;
      }
    });

    analysisResults.forEach((a) => {
      const cat = a.category || 'General';
      if (map.has(cat) && a.estimated_sales_at_risk) {
        map.get(cat)!.estimatedSalesAtRisk += a.estimated_sales_at_risk;
      }
    });

    inspections.forEach((insp) => {
      const product = analysisResults.find((a) => a.product_id === insp.product_id);
      const cat = product?.category || 'General';
      if (map.has(cat) && insp.confirmed_financial_loss) {
        map.get(cat)!.confirmedLoss += insp.confirmed_financial_loss;
      }
    });

    return Array.from(map.entries()).map(([cat, data]) => ({
      category: cat,
      ...data,
    }));
  }, [inventoryRecords, analysisResults, inspections]);

  // Total Recorded Sales Revenue
  const totalRecordedRevenue = React.useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      if (r.selling_price !== null) {
        return acc + r.units_sold * r.selling_price;
      }
      return acc;
    }, 0);
  }, [filteredRecords]);

  // Export handlers
  const handleExportInventory = () => {
    const csv = CsvImportService.exportCleanedDataToCSV(inventoryRecords);
    CsvImportService.downloadFile(csv, 'supermarket_cleaned_inventory.csv');
  };

  const handleExportAlerts = () => {
    const csv = CsvImportService.exportAlertsToCSV(alerts);
    CsvImportService.downloadFile(csv, 'risk_alerts_report.csv');
  };

  const handleExportInspections = () => {
    const csv = CsvImportService.exportInspectionsToCSV(inspections);
    CsvImportService.downloadFile(csv, 'shelf_inspection_audit_records.csv');
  };

  const handleExportFinancials = () => {
    const csv = CsvImportService.exportFinancialSummaryToCSV(categoryFinancialSummary);
    CsvImportService.downloadFile(csv, 'financial_loss_and_sales_at_risk.csv');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Export Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Financial & Inventory Risk Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Recorded checkout revenues, estimated sales at risk, and audit-verified financial loss metrics in Indian Rupees (₹).
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportFinancials}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Financials (₹)</span>
          </button>
          <button
            onClick={handleExportAlerts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Alerts CSV</span>
          </button>
          <button
            onClick={handleExportInspections}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Inspection Audits CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-subtle p-4 border-l-4 border-l-emerald-600">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Recorded Sales Revenue (Actual POS)
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {formatINR(totalRecordedRevenue)}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">
            Calculated as Units Sold × Unit Selling Price
          </p>
        </div>

        <div className="card-subtle p-4 border-l-4 border-l-amber-500 bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Estimated Sales at Risk (Unconfirmed)
          </span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">
            {formatINR(dashboardKPIs.estimatedSalesAtRisk)}
          </span>
          <p className="text-[10px] text-amber-700 mt-1">
            Expected Demand Shortfall × Duration × Price
          </p>
        </div>

        <div className="card-subtle p-4 border-l-4 border-l-red-500">
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">
            Confirmed Financial Loss (Audit Verified)
          </span>
          <span className="text-2xl font-black text-red-700 mt-1 block">
            {formatINR(dashboardKPIs.confirmedFinancialLoss)}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">
            Missing Shelf Stock × Unit Price (Verified by physical inspections)
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Over Time */}
        <div className="card-subtle p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
            Recorded Daily Revenue Trends (₹)
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">Total store checkout revenue by date</p>

          <div className="h-64 w-full">
            {revenueTrends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No chronological sales data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrends} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(val) => formatCompactINR(val)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val)), 'Recorded Revenue']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="recordedRevenue"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#0d9488' }}
                    name="Revenue (₹)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Store Comparison (if multi-store) */}
        <div className="card-subtle p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
            Store Branch Revenue & Risk Comparison (₹)
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">Comparing sales revenue vs sales at risk across branches</p>

          <div className="h-64 w-full">
            {storeComparisons.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Single store registered. Multi-branch comparison displays when multiple store IDs exist.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storeComparisons} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="location" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(val) => formatCompactINR(val)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [formatINR(Number(val)), name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="recordedRevenue" fill="#0d9488" name="Recorded Sales (₹)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="salesAtRisk" fill="#f59e0b" name="Estimated Sales at Risk (₹)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Category Financial Breakdown Table */}
      <div className="card-subtle overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Category-Wise Financial & Discrepancy Breakdown
          </h3>
          <span className="text-[11px] text-slate-500">Amounts in Indian Rupees (₹)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Recorded POS Revenue (₹)</th>
                <th className="py-3 px-4 text-right">Estimated Sales at Risk (₹)</th>
                <th className="py-3 px-4 text-right">Confirmed Shelf Loss (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryFinancialSummary.map((item) => (
                <tr key={item.category} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{item.category}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700">
                    {formatINR(item.recordedRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-amber-700">
                    {formatINR(item.estimatedSalesAtRisk)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-red-600">
                    {formatINR(item.confirmedLoss)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.estimatedSalesAtRisk > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Exposure Detected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Healthy
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
