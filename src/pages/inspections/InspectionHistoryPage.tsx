import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  User,
  ArrowUpDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { formatINR } from '../../utils/currencyFormatter';
import { CsvImportService } from '../../services/csvImportService';
import { InspectionRecord } from '../../types';

export const InspectionHistoryPage: React.FC = () => {
  const { inspections, dashboardKPIs, selectedStoreFilter } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verifiedFilter, setVerifiedFilter] = useState('ALL');

  const filteredInspections = React.useMemo(() => {
    return inspections.filter((insp) => {
      if (selectedStoreFilter !== 'ALL' && insp.store_id !== selectedStoreFilter) return false;

      const matchSearch =
        insp.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        insp.product_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        insp.inspector_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || insp.status === statusFilter;
      const matchVerified =
        verifiedFilter === 'ALL'
          ? true
          : verifiedFilter === 'VERIFIED'
          ? insp.verified_discrepancy
          : !insp.verified_discrepancy;

      return matchSearch && matchStatus && matchVerified;
    });
  }, [inspections, selectedStoreFilter, searchQuery, statusFilter, verifiedFilter]);

  const handleExportCSV = () => {
    const csv = CsvImportService.exportInspectionsToCSV(filteredInspections);
    CsvImportService.downloadFile(csv, 'physical_shelf_inspections_history.csv');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Physical Shelf Inspection History & Audit Trail
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold">
              {inspections.length} Audits Logged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconciles physical supermarket shelf reality against the book inventory database with verified loss calculations.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredInspections.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Inspection Logs</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-subtle p-4 border-l-4 border-l-teal-600">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Shelf Audits
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {inspections.length}
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">Logged inspections in record</p>
        </div>

        <div className="card-subtle p-4 border-l-4 border-l-red-500">
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">
            Verified Phantom Discrepancies
          </span>
          <span className="text-2xl font-black text-red-600 mt-1 block">
            {dashboardKPIs.confirmedDiscrepancies}
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">Physical shelf shortages confirmed</p>
        </div>

        <div className="card-subtle p-4 border-l-4 border-l-amber-500 bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Total Confirmed Loss (₹)
          </span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">
            {formatINR(dashboardKPIs.confirmedFinancialLoss)}
          </span>
          <p className="text-[10px] text-amber-700 mt-0.5">Verified missing inventory value</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card-subtle p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search product, SKU, inspector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Inspection Outcomes</option>
            <option value="VERIFIED">Verified Discrepancy Only</option>
            <option value="UNVERIFIED">No Discrepancy (Stock Present)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">All Audit Statuses</option>
            <option value="resolved">Resolved</option>
            <option value="in_progress">In Progress</option>
            <option value="follow_up">Follow-up</option>
          </select>
        </div>
      </div>

      {/* Inspection Records Table */}
      <div className="card-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Audit Date & Time</th>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Store Branch</th>
                <th className="py-3 px-4 text-center">System Stock vs Shelf Count</th>
                <th className="py-3 px-4 text-center">Shelf Availability</th>
                <th className="py-3 px-4">Discrepancy Cause</th>
                <th className="py-3 px-4 text-right">Confirmed Loss (₹)</th>
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                    No physical shelf inspections recorded yet. Start inspections from the Top 20 or Inventory Analysis pages.
                  </td>
                </tr>
              ) : (
                filteredInspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {new Date(insp.timestamp).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{insp.product_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{insp.product_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {insp.store_location || insp.store_id}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-semibold text-slate-500">
                        {insp.recorded_quantity} book
                      </span>{' '}
                      →{' '}
                      <span className="font-bold text-slate-900">
                        {insp.actual_shelf_quantity} counted
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {insp.shelf_availability === 'unavailable' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          Unavailable
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 capitalize">
                        {insp.discrepancy_type.replace(/_/g, ' ')}
                      </div>
                      {insp.notes && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                          "{insp.notes}"
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-red-600">
                      {insp.confirmed_financial_loss !== null
                        ? formatINR(insp.confirmed_financial_loss)
                        : '₹0.00'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {insp.inspector_name}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={insp.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
