import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  History,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CSVUploadZone } from '../../components/csv/CSVUploadZone';
import { ImportSummaryCard } from '../../components/csv/ImportSummaryCard';
import { CleanedInventoryRecord, DataCleaningReport } from '../../types';

export const CSVUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    settings,
    inventoryRecords,
    cleaningReport,
    importCSVFile,
    runRiskDetection,
  } = useApp();

  const [uploadedResult, setUploadedResult] = useState<{
    file: File | null;
    cleanedRecords: CleanedInventoryRecord[];
    report: DataCleaningReport;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleValidationSuccess = (result: {
    file: File | null;
    cleanedRecords: CleanedInventoryRecord[];
    report: DataCleaningReport;
  }) => {
    setUploadedResult(result);
  };

  const handleProceedImport = async () => {
    if (!uploadedResult) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      if (uploadedResult.file) {
        await importCSVFile(uploadedResult.file, 'replace');
      }
      setIsProcessing(false);
      setSuccessMessage('Dataset successfully imported, sanitized, and evaluated with Risk Engine!');
      runRiskDetection();
      navigate('/dashboard');
    } catch (err: any) {
      setIsProcessing(false);
      alert(err?.message || 'Failed to complete import.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
              Data Ingestion
            </span>
            <span className="text-xs text-slate-500">
              Store: {settings.supermarketName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Easy CSV Upload & Inventory Cleaning
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload your POS sales and closing stock records. Automatically detect columns, sanitize formatting, deduplicate records, and evaluate risk.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
        >
          <span>Go to Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div className="card-subtle p-6 space-y-4">
        <CSVUploadZone
          supermarketName={settings.supermarketName}
          onValidationSuccess={handleValidationSuccess}
          onProceedDirectly={handleProceedImport}
          showProceedButton={true}
          proceedButtonLabel={isProcessing ? 'Processing Dataset...' : 'Proceed to Dashboard'}
        />
      </div>

      {/* Active Import Summary if validated */}
      {uploadedResult && uploadedResult.report && (
        <ImportSummaryCard
          report={uploadedResult.report}
          onProceedToDashboard={handleProceedImport}
          showProceedButton={true}
        />
      )}
    </div>
  );
};
