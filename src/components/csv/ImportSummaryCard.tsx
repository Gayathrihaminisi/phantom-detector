import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileCheck2,
  Calendar,
  Building2,
} from 'lucide-react';
import { DataCleaningReport } from '../../types';

interface ImportSummaryCardProps {
  report: DataCleaningReport;
  onProceedToDashboard?: () => void;
  showProceedButton?: boolean;
}

export const ImportSummaryCard: React.FC<ImportSummaryCardProps> = ({
  report,
  onProceedToDashboard,
  showProceedButton = true,
}) => {
  const isHealthy = report.validAcceptedRecords > 0 && !report.requiresReview;
  const canProceed = report.validAcceptedRecords > 0;

  return (
    <div className="card-subtle p-6 space-y-5 animate-fade-in border-teal-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isHealthy
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Dataset Cleaning & Import Summary
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  report.dataQualityPercentage >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Data Quality: {report.dataQualityPercentage}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Supermarket: <strong>{report.supermarketName}</strong> • Mode: {report.importMode.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Imported: {new Date(report.importTimestamp).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Grid of Key Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold block">Total Received</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {report.totalRowsReceived}
          </span>
          <span className="text-[10px] text-slate-400">CSV rows</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <span className="text-[11px] text-emerald-700 font-semibold block">Valid Records</span>
          <span className="text-xl font-black text-emerald-900 mt-1 block">
            {report.validAcceptedRecords}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">Active in System</span>
        </div>

        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200">
          <span className="text-[11px] text-teal-700 font-semibold block">Auto-Corrected</span>
          <span className="text-xl font-black text-teal-900 mt-1 block">
            {report.recordsCorrected}
          </span>
          <span className="text-[10px] text-teal-600">Standardized</span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
          <span className="text-[11px] text-amber-700 font-semibold block">Duplicates</span>
          <span className="text-xl font-black text-amber-900 mt-1 block">
            {report.duplicateRecordsIdentified}
          </span>
          <span className="text-[10px] text-amber-600">De-duplicated</span>
        </div>

        <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
          <span className="text-[11px] text-red-700 font-semibold block">Rejected Rows</span>
          <span className="text-xl font-black text-red-900 mt-1 block">
            {report.invalidRecordsRejected}
          </span>
          <span className="text-[10px] text-red-600 font-semibold">Fatal Errors</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold block">Warnings</span>
          <span className="text-xl font-black text-slate-700 mt-1 block">
            {report.missingValueWarnings}
          </span>
          <span className="text-[10px] text-slate-400">Non-fatal</span>
        </div>
      </div>

      {/* Pipeline Status Message */}
      <div
        className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
          canProceed
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            : 'bg-red-50 border border-red-200 text-red-900'
        }`}
      >
        {canProceed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <p className="font-bold">
            {canProceed
              ? 'Data Cleaning Completed Successfully!'
              : 'Data Cleaning Incomplete — Essential Fields Missing'}
          </p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            {canProceed
              ? `The Risk Detection Engine has evaluated your ${report.validAcceptedRecords} inventory items. All dashboard KPIs, priority inspections, and sales at risk in Indian Rupees (₹) are now synchronized with this dataset.`
              : 'Your dataset does not contain sufficient valid records to proceed. Please correct the fatal errors highlighted in the preview or upload a revised CSV file.'}
          </p>
        </div>
      </div>

      {/* Cleaning steps checklist */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Executed Cleaning Operations
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {report.cleaningStepsCompleted.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proceed Button */}
      {showProceedButton && onProceedToDashboard && (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onProceedToDashboard}
            disabled={!canProceed}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <span>Proceed to Supermarket Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
