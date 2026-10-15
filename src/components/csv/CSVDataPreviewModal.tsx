import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wand2,
  Edit,
  Trash2,
  Download,
  X,
  FileCheck2,
  ArrowRight,
  FileText,
  HelpCircle,
} from 'lucide-react';
import {
  RawCSVRecord,
  CleanedInventoryRecord,
  ValidationError,
  DataCleaningReport,
} from '../../types';
import { formatINR } from '../../utils/currencyFormatter';
import { DataCleaningService } from '../../services/dataCleaningService';
import { CsvImportService } from '../../services/csvImportService';
import { RecordEditModal } from './RecordEditModal';

interface CSVDataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawRows: RawCSVRecord[];
  cleanedRows: CleanedInventoryRecord[];
  errors: ValidationError[];
  report: DataCleaningReport;
  onProceedImport: (finalCleaned: CleanedInventoryRecord[]) => void;
  onUpdateRawRows?: (updated: RawCSVRecord[]) => void;
}

export const CSVDataPreviewModal: React.FC<CSVDataPreviewModalProps> = ({
  isOpen,
  onClose,
  rawRows,
  cleanedRows,
  errors,
  report,
  onProceedImport,
  onUpdateRawRows,
}) => {
  const [viewMode, setViewMode] = useState<'cleaned' | 'original'>('cleaned');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected row for editing
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

  // Filter errors by row index for quick lookup
  const errorsByRow = useMemo(() => {
    const map = new Map<number, ValidationError[]>();
    errors.forEach((err) => {
      if (!map.has(err.rowIndex)) {
        map.set(err.rowIndex, []);
      }
      map.get(err.rowIndex)!.push(err);
    });
    return map;
  }, [errors]);

  // Counts
  const fatalErrorsCount = errors.filter((e) => e.severity === 'error' && e.rowIndex > 0).length;
  const warningsCount = errors.filter((e) => e.severity === 'warning').length;
  const validCount = cleanedRows.length;

  // Handle Sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort for Cleaned view
  const filteredCleaned = useMemo(() => {
    let result = [...cleanedRows];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.product_id.toLowerCase().includes(q) ||
          r.product_name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.store_id.toLowerCase().includes(q) ||
          r.date.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return result;
  }, [cleanedRows, searchTerm, sortField, sortDirection]);

  // Filter and sort for Raw view
  const filteredRaw = useMemo(() => {
    let result = rawRows.map((row, index) => ({ row, rowIndex: index + 1 }));

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(({ row }) =>
        Object.values(row).some((val) => val && String(val).toLowerCase().includes(q))
      );
    }

    return result;
  }, [rawRows, searchTerm]);

  // Pagination calculations
  const totalItems = viewMode === 'cleaned' ? filteredCleaned.length : filteredRaw.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedCleaned = filteredCleaned.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedRaw = filteredRaw.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Actions
  const handleDownloadErrorReport = () => {
    const csv = DataCleaningService.generateErrorReportCSV(errors);
    CsvImportService.downloadFile(csv, 'inventory_cleaning_error_report.csv');
  };

  const handleSkipInvalidRows = () => {
    if (
      window.confirm(
        `Skip ${fatalErrorsCount} invalid row(s) and proceed with the ${validCount} valid records?`
      )
    ) {
      onProceedImport(cleanedRows);
      onClose();
    }
  };

  const handleSaveEditedRecord = (index: number, updated: RawCSVRecord) => {
    if (onUpdateRawRows) {
      const next = [...rawRows];
      next[index] = updated;
      onUpdateRawRows(next);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Inventory Dataset Preview & Inspection
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                  Quality: {report.dataQualityPercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Compare original CSV data against sanitized output, review plain-English errors, and confirm validation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode & Metrics Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <button
              onClick={() => {
                setViewMode('cleaned');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'cleaned'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>View Cleaned Data ({validCount})</span>
            </button>
            <button
              onClick={() => {
                setViewMode('original');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'original'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>View Original Raw Data ({rawRows.length})</span>
            </button>
          </div>

          {/* Counts */}
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{validCount} Valid Records</span>
            </span>
            {warningsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{warningsCount} Warnings</span>
              </span>
            )}
            {fatalErrorsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-800 font-semibold border border-red-200">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span>{fatalErrorsCount} Rejected Rows</span>
              </span>
            )}
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="px-6 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by SKU, product name, category, or branch..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {errors.length > 0 && (
              <button
                onClick={handleDownloadErrorReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                title="Download CSV report of all detected issues"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Error Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {viewMode === 'cleaned' ? (
            /* Cleaned Data Table */
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th
                      onClick={() => handleSort('date')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        {sortField === 'date' &&
                          (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('store_id')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                    >
                      <div className="flex items-center gap-1">
                        <span>Store</span>
                        {sortField === 'store_id' &&
                          (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('product_id')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                    >
                      <div className="flex items-center gap-1">
                        <span>SKU & Name</span>
                        {sortField === 'product_id' &&
                          (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('category')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                    >
                      <div className="flex items-center gap-1">
                        <span>Category</span>
                        {sortField === 'category' &&
                          (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('units_sold')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Units Sold</span>
                        {sortField === 'units_sold' &&
                          (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('recorded_closing_stock')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Closing Stock</span>
                        {sortField === 'recorded_closing_stock' &&
                          (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('selling_price')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Price (₹)</span>
                        {sortField === 'selling_price' &&
                          (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right">Baseline (Sales/Day)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCleaned.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedCleaned.map((record) => {
                      const isPriceMissing = record.selling_price === null;
                      const isInferredBaseline = record.is_inferred_baseline;

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-800">{record.date}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{record.store_id}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{record.product_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{record.product_id}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{record.category}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {record.units_sold}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-teal-800">
                            {record.recorded_closing_stock}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isPriceMissing ? (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                                title="Selling price is missing; revenue and sales at risk cannot be calculated in ₹."
                              >
                                Unavailable
                              </span>
                            ) : (
                              <span className="font-semibold text-slate-800">
                                {formatINR(record.selling_price)}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-mono text-slate-700">
                              {record.average_daily_sales}
                            </span>
                            {isInferredBaseline && (
                              <span
                                className="ml-1 text-[9px] text-teal-600 font-bold"
                                title="Inferred from historical data"
                              >
                                (Inferred)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Valid
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Original Raw Data Table with Highlights for Missing/Invalid */
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Row #</th>
                    {rawRows.length > 0 &&
                      Object.keys(rawRows[0]).map((h) => (
                        <th key={h} className="py-2.5 px-3">
                          {h}
                        </th>
                      ))}
                    <th className="py-2.5 px-3">Validation Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRaw.length === 0 ? (
                    <tr>
                      <td
                        colSpan={(rawRows.length > 0 ? Object.keys(rawRows[0]).length : 1) + 2}
                        className="py-8 text-center text-slate-400 italic"
                      >
                        No raw rows available.
                      </td>
                    </tr>
                  ) : (
                    paginatedRaw.map(({ row, rowIndex }) => {
                      const rowErrors = errorsByRow.get(rowIndex) || [];
                      const hasFatal = rowErrors.some((e) => e.severity === 'error');
                      const hasWarning = rowErrors.some((e) => e.severity === 'warning');

                      return (
                        <tr
                          key={rowIndex}
                          className={`transition-colors ${
                            hasFatal
                              ? 'bg-red-50/60 hover:bg-red-50'
                              : hasWarning
                              ? 'bg-amber-50/40 hover:bg-amber-50/60'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                            #{rowIndex}
                          </td>
                          {Object.keys(row).map((k) => {
                            const val = row[k];
                            const cellError = rowErrors.find((e) => e.fieldName === k);
                            const isCellFatal = cellError?.severity === 'error';
                            const isCellWarning = cellError?.severity === 'warning';

                            return (
                              <td
                                key={k}
                                className={`py-2.5 px-3 ${
                                  isCellFatal
                                    ? 'bg-red-100/80 text-red-900 font-semibold'
                                    : isCellWarning
                                    ? 'bg-amber-100/70 text-amber-900 font-medium'
                                    : 'text-slate-800'
                                }`}
                                title={cellError?.errorMessage}
                              >
                                {val === '' || val === undefined ? (
                                  <span className="italic text-slate-400 font-normal">[blank]</span>
                                ) : (
                                  val
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3">
                            {hasFatal ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3" />
                                  Rejected
                                </span>
                                <p className="text-[10px] text-red-700 max-w-xs">
                                  {rowErrors.find((e) => e.severity === 'error')?.errorMessage}
                                </p>
                              </div>
                            ) : hasWarning ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <AlertTriangle className="w-3 h-3" />
                                  Warning
                                </span>
                                <p className="text-[10px] text-amber-700 max-w-xs">
                                  {rowErrors.find((e) => e.severity === 'warning')?.errorMessage}
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setEditingRowIndex(rowIndex - 1)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Edit this record row"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination & Footer Controls */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          {/* Pagination */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>
              Showing {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} to{' '}
              {Math.min(totalItems, currentPage * pageSize)} of {totalItems} entries
            </span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
            >
              Close
            </button>

            {fatalErrorsCount > 0 && validCount > 0 && (
              <button
                onClick={handleSkipInvalidRows}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Skip {fatalErrorsCount} Invalid & Import Valid</span>
              </button>
            )}

            <button
              onClick={() => {
                onProceedImport(cleanedRows);
                onClose();
              }}
              disabled={validCount === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <span>Confirm & Import Dataset ({validCount} items)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Edit Modal */}
      {editingRowIndex !== null && (
        <RecordEditModal
          isOpen={editingRowIndex !== null}
          onClose={() => setEditingRowIndex(null)}
          recordIndex={editingRowIndex}
          record={rawRows[editingRowIndex]}
          onSaveRecord={handleSaveEditedRecord}
        />
      )}
    </div>
  );
};
