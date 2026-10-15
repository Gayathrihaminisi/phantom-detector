import React, { useState } from 'react';
import {
  Database,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Check,
  Building2,
  Trash2,
  PlayCircle,
  FileCheck2,
  History,
  Layers,
  Search,
  Eye,
  Edit2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ImportMode, CleanedInventoryRecord, DataCleaningReport } from '../../types';
import { DataCleaningService } from '../../services/dataCleaningService';
import { CsvImportService } from '../../services/csvImportService';
import { CSVUploadZone } from '../../components/csv/CSVUploadZone';
import { ImportSummaryCard } from '../../components/csv/ImportSummaryCard';
import { ImportHistoryList } from '../../components/csv/ImportHistoryList';
import { formatINR } from '../../utils/currencyFormatter';

export const DataManagementPage: React.FC = () => {
  const {
    settings,
    inventoryRecords,
    cleaningReport,
    importHistory,
    canUndoImport,
    importCSVFile,
    undoLastImport,
    loadSimulatedDemoData,
    runRiskDetection,
    editInventoryRecord,
    deleteInventoryRecord,
    clearAllData,
    detectionState,
  } = useApp();

  const [importMode, setImportMode] = useState<ImportMode>('replace');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [searchSKU, setSearchSKU] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Editing state for inventory table
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ units_sold?: number; recorded_closing_stock?: number; selling_price?: number | null }>({});

  const handleValidationSuccess = async ({
    file,
    cleanedRecords,
    report,
  }: {
    file: File | null;
    cleanedRecords: CleanedInventoryRecord[];
    report: DataCleaningReport;
  }) => {
    if (!file) return;

    // Explain consequences before replacing or merging
    let confirmMsg = '';
    if (importMode === 'replace') {
      confirmMsg = `This will replace your current ${inventoryRecords.length} inventory records with the ${cleanedRecords.length} newly cleaned records. (You can undo this import at any time). Proceed?`;
    } else if (importMode === 'merge') {
      confirmMsg = `This will merge ${cleanedRecords.length} records into your existing inventory based on Date + Store ID + Product SKU. Proceed?`;
    } else {
      confirmMsg = `This will append ${cleanedRecords.length} records to your existing store inventory. Proceed?`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await importCSVFile(file, importMode);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Successfully processed and imported ${cleanedRecords.length} records using ${importMode.toUpperCase()} mode. Risk engine re-evaluated!`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'CSV file could not be parsed into valid inventory records.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Error occurred while processing file.',
      });
    }
  };

  const handleUndo = () => {
    const res = undoLastImport();
    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  const handleDownloadSample = () => {
    const csvContent = DataCleaningService.generateSampleCSVTemplate();
    CsvImportService.downloadFile(csvContent, 'supermarket_inventory_template.csv');
  };

  const handleExportCleanedData = () => {
    const csv = CsvImportService.exportCleanedDataToCSV(inventoryRecords);
    CsvImportService.downloadFile(csv, 'cleaned_supermarket_inventory.csv');
  };

  // Filtered inventory records for table
  const filteredInventory = inventoryRecords.filter(
    (r) =>
      r.product_id.toLowerCase().includes(searchSKU.toLowerCase()) ||
      r.product_name.toLowerCase().includes(searchSKU.toLowerCase()) ||
      r.category.toLowerCase().includes(searchSKU.toLowerCase()) ||
      r.store_id.toLowerCase().includes(searchSKU.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / pageSize));
  const paginatedInventory = filteredInventory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleStartEdit = (rec: CleanedInventoryRecord) => {
    setEditingId(rec.id);
    setEditValues({
      units_sold: rec.units_sold,
      recorded_closing_stock: rec.recorded_closing_stock,
      selling_price: rec.selling_price,
    });
  };

  const handleSaveEdit = (id: string) => {
    editInventoryRecord(id, editValues);
    setEditingId(null);
    setFeedback({
      type: 'success',
      message: 'Record updated successfully! Risk engine recalculated.',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
              Supermarket Data Operations
            </span>
            <span className="text-xs text-slate-500">
              Branch: {settings.supermarketName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Inventory Data Management & CSV Processing
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Import, replace, or merge supermarket CSV datasets, review cleaning audit reports, and undo imports when needed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => runRiskDetection()}
            disabled={detectionState === 'running'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all ${
              detectionState === 'running'
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            <PlayCircle className={`w-3.5 h-3.5 ${detectionState === 'running' ? 'animate-spin' : ''}`} />
            <span>{detectionState === 'running' ? 'Analysing...' : 'Run Risk Engine'}</span>
          </button>

          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV Template</span>
          </button>

          <button
            onClick={handleExportCleanedData}
            disabled={inventoryRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Cleaned CSV</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Import Mode Selector & Upload Area */}
      <div className="card-subtle p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-600" />
              <span>Import Supermarket Inventory CSV</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your import strategy before uploading your file.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Import Mode:</span>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as ImportMode)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs"
            >
              <option value="replace">Replace Existing Dataset</option>
              <option value="append">Append New Records</option>
              <option value="merge">Merge & Update by Date+SKU</option>
            </select>
          </div>
        </div>

        {/* Mode Explanation Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">
              {importMode === 'replace' && 'Replace Mode: '}
              {importMode === 'append' && 'Append Mode: '}
              {importMode === 'merge' && 'Merge Mode: '}
            </span>
            <span>
              {importMode === 'replace' &&
                'Replaces current inventory with the newly cleaned records. Your previous dataset state is saved and can be restored using Undo.'}
              {importMode === 'append' &&
                'Adds new transaction records to your existing store dataset. Exact duplicates are automatically detected and filtered.'}
              {importMode === 'merge' &&
                'Updates existing items matching (Date + Store ID + Product SKU) with the latest values, and inserts new SKUs.'}
            </span>
          </div>
        </div>

        {/* Reusable CSV Upload Zone */}
        <CSVUploadZone
          supermarketName={settings.supermarketName}
          onValidationSuccess={handleValidationSuccess}
          showProceedButton={false}
        />
      </div>

      {/* Active Cleaning Report Card */}
      {cleaningReport && <ImportSummaryCard report={cleaningReport} showProceedButton={false} />}

      {/* Import History & Audit Log (Undo Available) */}
      <ImportHistoryList
        history={importHistory}
        canUndo={canUndoImport}
        onUndoLatestImport={handleUndo}
      />

      {/* Active Inventory Records Table & Inline Editing */}
      <div className="card-subtle p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-600" />
              <span>Current Active Inventory Records ({inventoryRecords.length} SKUs)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Source of truth for Risk Detection, Top 20 Prioritization, and INR Financial Risk Analytics.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchSKU}
              onChange={(e) => {
                setSearchSKU(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by SKU, item name, or category..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Branch ID</th>
                <th className="py-2.5 px-3">Product SKU & Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Units Sold</th>
                <th className="py-2.5 px-3 text-right">Closing Stock</th>
                <th className="py-2.5 px-3 text-right">Selling Price (₹)</th>
                <th className="py-2.5 px-3 text-right">Baseline / Day</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No inventory records found. Upload a CSV file or load demo dataset above.
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((item) => {
                  const isEditing = editingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-800">{item.date}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{item.store_id}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.product_id}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues.units_sold ?? item.units_sold}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                units_sold: Math.max(0, parseInt(e.target.value) || 0),
                              }))
                            }
                            className="w-16 px-1.5 py-0.5 border border-teal-500 rounded text-right text-xs"
                          />
                        ) : (
                          item.units_sold
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-teal-800">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues.recorded_closing_stock ?? item.recorded_closing_stock}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                recorded_closing_stock: Math.max(0, parseInt(e.target.value) || 0),
                              }))
                            }
                            className="w-16 px-1.5 py-0.5 border border-teal-500 rounded text-right text-xs"
                          />
                        ) : (
                          `${item.recorded_closing_stock} units`
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editValues.selling_price ?? (item.selling_price || 0)}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                selling_price: parseFloat(e.target.value) || null,
                              }))
                            }
                            className="w-20 px-1.5 py-0.5 border border-teal-500 rounded text-right text-xs"
                          />
                        ) : (
                          formatINR(item.selling_price)
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {item.average_daily_sales}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-2 py-1 rounded bg-teal-600 text-white font-bold text-[10px] hover:bg-teal-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 rounded text-slate-500 hover:text-teal-700 hover:bg-slate-100"
                              title="Edit row values"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete record for ${item.product_name}?`)) {
                                  deleteInventoryRecord(item.id);
                                }
                              }}
                              className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-slate-100"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredInventory.length > pageSize && (
          <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
            <span>
              Showing {Math.min(filteredInventory.length, (currentPage - 1) * pageSize + 1)} to{' '}
              {Math.min(filteredInventory.length, currentPage * pageSize)} of {filteredInventory.length} records
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone: Clear Data */}
      <div className="card-subtle p-4 flex items-center justify-between border-red-200 bg-red-50/20">
        <div>
          <h4 className="text-xs font-bold text-red-900">Reset Local Demo Storage</h4>
          <p className="text-[11px] text-red-700 mt-0.5">
            Erase imported inventory records, alerts, and inspections from demo storage.
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Reset all demo inventory and inspection records?')) {
              clearAllData();
              setFeedback({
                type: 'success',
                message: 'All local demo inventory and inspections have been reset.',
              });
            }
          }}
          className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>
    </div>
  );
};
