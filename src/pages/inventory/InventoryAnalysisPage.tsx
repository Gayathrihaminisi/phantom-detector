import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RiskBadge, StatusBadge } from '../../components/ui/Badge';
import { formatINR, calculateRevenue } from '../../utils/currencyFormatter';
import { RiskAnalysisResult } from '../../types';
import { InspectionModal } from '../../components/inspections/InspectionModal';
import { ProductDetailDrawer } from '../../components/inventory/ProductDetailDrawer';
import { CsvImportService } from '../../services/csvImportService';

type SortField =
  | 'product_name'
  | 'category'
  | 'store_location'
  | 'recorded_stock'
  | 'average_daily_sales'
  | 'recent_daily_sales'
  | 'days_since_last_sale'
  | 'selling_price'
  | 'risk_score'
  | 'estimated_sales_at_risk';

export const InventoryAnalysisPage: React.FC = () => {
  const {
    analysisResults,
    inspections,
    submitInspection,
    selectedStoreFilter,
    runRiskDetection,
    detectionState,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [riskLevelFilter, setRiskLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priceFilter, setPriceFilter] = useState<'ALL' | 'with_price' | 'missing_price'>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('risk_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Drawer & Modal
  const [drawerProduct, setDrawerProduct] = useState<RiskAnalysisResult | null>(null);
  const [inspectionProduct, setInspectionProduct] = useState<RiskAnalysisResult | null>(null);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    analysisResults.forEach((r) => set.add(r.category));
    return Array.from(set).sort();
  }, [analysisResults]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filtered & Sorted Records
  const processedRecords = useMemo(() => {
    let result = analysisResults.filter((item) => {
      // Store filter
      if (selectedStoreFilter !== 'ALL' && item.store_id !== selectedStoreFilter) {
        return false;
      }
      // Search
      const query = searchQuery.toLowerCase();
      const matchSearch =
        item.product_name.toLowerCase().includes(query) ||
        item.product_id.toLowerCase().includes(query) ||
        item.store_location.toLowerCase().includes(query);

      // Category
      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;

      // Risk
      const matchRisk = riskLevelFilter === 'ALL' || item.risk_category === riskLevelFilter;

      // Status
      const matchStatus = statusFilter === 'ALL' || item.inspection_status === statusFilter;

      // Price Filter
      const matchPrice =
        priceFilter === 'ALL' ||
        (priceFilter === 'with_price' && item.selling_price !== null && item.price_status === 'valid') ||
        (priceFilter === 'missing_price' && (item.selling_price === null || item.price_status !== 'valid'));

      return matchSearch && matchCat && matchRisk && matchStatus && matchPrice;
    });

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField as keyof RiskAnalysisResult];
      let valB: any = b[sortField as keyof RiskAnalysisResult];

      if (valA === null || valA === undefined) valA = -999999;
      if (valB === null || valB === undefined) valB = -999999;

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB as string);
        return sortDirection === 'asc' ? comp : -comp;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [
    analysisResults,
    selectedStoreFilter,
    searchQuery,
    categoryFilter,
    riskLevelFilter,
    statusFilter,
    priceFilter,
    sortField,
    sortDirection,
  ]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(processedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRecords.slice(start, start + pageSize);
  }, [processedRecords, currentPage, pageSize]);

  const handleExportFiltered = () => {
    const csvContent = CsvImportService.exportAnalysisResultsToCSV(processedRecords);
    CsvImportService.downloadFile(csvContent, 'filtered_inventory_analysis.csv');
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-teal-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-teal-600" />
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Supermarket Inventory Catalog & Risk Analysis
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              {processedRecords.length} Products Monitored
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Search, sort, filter, and drill into individual SKU sales baselines, stock records, and explainable risk scores.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <button
            onClick={handleExportFiltered}
            disabled={processedRecords.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Filtered Table</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-subtle p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, item name, branch..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={riskLevelFilter}
            onChange={(e) => {
              setRiskLevelFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Audit Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="follow_up">Follow-up</option>
          </select>
        </div>

        <div>
          <select
            value={priceFilter}
            onChange={(e) => {
              setPriceFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Prices</option>
            <option value="with_price">With Valid Price</option>
            <option value="missing_price">Missing Price Only</option>
          </select>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="card-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th
                  onClick={() => handleSort('product_name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Product Name & SKU</span>
                    {renderSortIcon('product_name')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    {renderSortIcon('category')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('store_location')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Store Branch</span>
                    {renderSortIcon('store_location')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recorded_stock')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock</span>
                    {renderSortIcon('recorded_stock')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('average_daily_sales')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Avg Daily</span>
                    {renderSortIcon('average_daily_sales')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recent_daily_sales')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Recent Sales</span>
                    {renderSortIcon('recent_daily_sales')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('days_since_last_sale')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Days Inactive</span>
                    {renderSortIcon('days_since_last_sale')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('selling_price')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Price (₹)</span>
                    {renderSortIcon('selling_price')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('risk_score')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Risk Level</span>
                    {renderSortIcon('risk_score')}
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Audit</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 italic">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => (
                  <tr
                    key={`${item.store_id}_${item.product_id}`}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.product_id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.category}</td>
                    <td className="py-3 px-4 text-slate-600">{item.store_location || item.store_id}</td>
                    <td className="py-3 px-4 text-right font-bold text-teal-800">
                      {item.recorded_stock}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {item.average_daily_sales}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={item.recent_daily_sales === 0 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                        {item.recent_daily_sales}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {item.days_since_last_sale} d
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {item.selling_price !== null && item.price_status === 'valid' ? (
                        <span className="text-slate-800">{formatINR(item.selling_price)}</span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold"
                          title="Price missing — financial exposure unavailable"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>Missing</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RiskBadge category={item.risk_category} score={item.risk_score} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={item.inspection_status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDrawerProduct(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="View Product Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setInspectionProduct(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-xs transition-colors"
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, processedRecords.length)} of {processedRecords.length} products
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        isOpen={drawerProduct !== null}
        onClose={() => setDrawerProduct(null)}
        product={drawerProduct}
        inspections={inspections}
        onStartInspection={(p) => {
          setDrawerProduct(null);
          setInspectionProduct(p);
        }}
      />

      {/* Inspection Modal */}
      <InspectionModal
        isOpen={inspectionProduct !== null}
        onClose={() => setInspectionProduct(null)}
        product={inspectionProduct}
        onSave={(data) => {
          submitInspection(data);
          setInspectionProduct(null);
        }}
      />
    </div>
  );
};
