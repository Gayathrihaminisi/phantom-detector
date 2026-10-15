import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Sparkles,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Play,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  RawCSVRecord,
  CleanedInventoryRecord,
  DataCleaningReport,
  ColumnMappingDetectionResult,
} from '../../types';
import { DataCleaningService, COLUMN_DESCRIPTIONS } from '../../services/dataCleaningService';
import { CsvImportService } from '../../services/csvImportService';
import { ColumnMappingModal } from './ColumnMappingModal';
import { CSVDataPreviewModal } from './CSVDataPreviewModal';

interface CSVUploadZoneProps {
  supermarketName: string;
  onValidationSuccess: (result: {
    file: File | null;
    cleanedRecords: CleanedInventoryRecord[];
    report: DataCleaningReport;
  }) => void;
  onProceedDirectly?: () => void;
  showProceedButton?: boolean;
  proceedButtonLabel?: string;
}

export const CSVUploadZone: React.FC<CSVUploadZoneProps> = ({
  supermarketName,
  onValidationSuccess,
  onProceedDirectly,
  showProceedButton = true,
  proceedButtonLabel = 'Proceed to Supermarket Dashboard',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Parsed and validated states
  const [rawRows, setRawRows] = useState<RawCSVRecord[]>([]);
  const [cleanedRecords, setCleanedRecords] = useState<CleanedInventoryRecord[]>([]);
  const [cleaningReport, setCleaningReport] = useState<DataCleaningReport | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [mappingResult, setMappingResult] = useState<ColumnMappingDetectionResult | null>(null);

  // Modals
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setFileError(null);

    // Validate file extension strictly
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Unsupported file format. Please upload a valid CSV (.csv) file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);

    try {
      const parsedRaw = await CsvImportService.parseCsvFile(file);
      if (!parsedRaw || parsedRaw.length === 0) {
        setFileError('The uploaded CSV file is empty or contains unreadable content.');
        setIsParsing(false);
        return;
      }

      setRawRows(parsedRaw);

      // Detect column mappings
      const headers = Object.keys(parsedRaw[0]);
      const mappings = DataCleaningService.detectColumnMappings(headers);
      setMappingResult(mappings);

      // Clean dataset
      const res = DataCleaningService.cleanDataset(parsedRaw, supermarketName, 'replace', []);
      setCleanedRecords(res.cleanedRecords);
      setCleaningReport(res.report);
      setValidationErrors(res.errors);

      setIsParsing(false);

      // Pass result to parent callback
      onValidationSuccess({
        file,
        cleanedRecords: res.cleanedRecords,
        report: res.report,
      });

      // If unmapped columns or missing required, prompt mapping modal automatically
      if (!mappings.canProceed || mappings.unmappedHeaders.length > 0) {
        setShowMappingModal(true);
      }
    } catch (err: any) {
      setIsParsing(false);
      setFileError(
        err?.message ||
          'Failed to read CSV. Please ensure the file is properly formatted with comma-separated values.'
      );
    }
  };

  const handleConfirmCustomMapping = (customMapping: Record<string, string>) => {
    setShowMappingModal(false);
    if (rawRows.length > 0) {
      const res = DataCleaningService.cleanDataset(
        rawRows,
        supermarketName,
        'replace',
        [],
        customMapping
      );
      setCleanedRecords(res.cleanedRecords);
      setCleaningReport(res.report);
      setValidationErrors(res.errors);
      onValidationSuccess({
        file: selectedFile,
        cleanedRecords: res.cleanedRecords,
        report: res.report,
      });
    }
  };

  const handleDownloadSample = () => {
    const csvContent = DataCleaningService.generateSampleCSVTemplate();
    CsvImportService.downloadFile(csvContent, 'supermarket_inventory_template.csv');
  };

  const handleLoadDemoDataset = async () => {
    setIsParsing(true);
    setFileError(null);
    try {
      const { getSimulatedDataset } = await import('../../data/simulatedSupermarketData');
      const demoData = getSimulatedDataset();
      setRawRows(demoData);
      setSelectedFile(new File([''], 'simulated_supermarket_dataset.csv'));

      const headers = Object.keys(demoData[0]);
      const mappings = DataCleaningService.detectColumnMappings(headers);
      setMappingResult(mappings);

      const res = DataCleaningService.cleanDataset(demoData, supermarketName, 'replace', []);
      setCleanedRecords(res.cleanedRecords);
      setCleaningReport(res.report);
      setValidationErrors(res.errors);
      setIsParsing(false);

      onValidationSuccess({
        file: null,
        cleanedRecords: res.cleanedRecords,
        report: res.report,
      });
    } catch (err: any) {
      setIsParsing(false);
      setFileError('Failed to load simulated demo dataset.');
    }
  };

  const isDatasetReady = cleanedRecords.length > 0 && !isParsing;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action & Template Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-teal-600" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">CSV Template & Quick Demo</h4>
            <p className="text-[11px] text-slate-500">
              Download the official template or instantly evaluate with simulated Indian store records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemoDataset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Load Demo Data</span>
          </button>
        </div>
      </div>

      {/* Large Drag & Drop Upload Zone (STRICT PRIVACY: NO FILE SIZE DISPLAYED ANYWHERE!) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative p-8 sm:p-12 border-2 border-dashed rounded-2xl text-center transition-all ${
          dragActive
            ? 'border-teal-500 bg-teal-50/60 ring-4 ring-teal-500/10'
            : selectedFile
            ? 'border-emerald-500 bg-emerald-50/20'
            : 'border-slate-300 hover:border-teal-400 bg-slate-50/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
            <Upload className="w-7 h-7" />
          </div>

          {selectedFile ? (
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-emerald-800 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Selected File: {selectedFile.name}</span>
              </p>
              <p className="text-xs text-slate-500">
                {isParsing ? 'Sanitizing, mapping columns, and validating records...' : 'File parsed and validated successfully.'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-slate-800">
                Drag and drop your supermarket CSV file here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports standard comma-separated retail inventory and sales files.
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Choose CSV File</span>
            </button>

            {selectedFile && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setRawRows([]);
                  setCleanedRecords([]);
                  setCleaningReport(null);
                  setValidationErrors([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message for unsupported/unreadable file */}
      {fileError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2.5 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {/* Column Schema Requirements & Impact Guide */}
      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-teal-600" />
            <span>Supermarket CSV Schema Specifications</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Synonyms (like Product ID, sales, closing_stock, price in ₹) are auto-detected
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-slate-800 font-bold mb-1">Required Columns (Minimum 5):</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'date', tip: 'YYYY-MM-DD or DD-MM-YYYY' },
                { name: 'store_id', tip: 'Branch ID code' },
                { name: 'product_id', tip: 'SKU / Barcode' },
                { name: 'units_sold', tip: 'Non-negative checkout sales' },
                { name: 'recorded_closing_stock', tip: 'Non-negative book stock' },
              ].map((c) => (
                <span
                  key={c.name}
                  className="px-2 py-1 rounded-md bg-white border border-slate-300 font-mono text-[11px] text-slate-900 font-semibold shadow-2xs"
                  title={c.tip}
                >
                  {c.name} *
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-slate-700 font-semibold mb-1">Recommended / Optional Columns:</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800">selling_price (₹)</strong> (enables revenue & sales at risk in ₹),{' '}
              <strong className="text-slate-800">product_name</strong>,{' '}
              <strong className="text-slate-800">category</strong>,{' '}
              <strong className="text-slate-800">store_location</strong>,{' '}
              <strong className="text-slate-800">average_daily_sales</strong> (auto-inferred if omitted),{' '}
              <strong className="text-slate-800">recent_daily_sales</strong>,{' '}
              <strong className="text-slate-800">days_since_last_sale</strong>,{' '}
              <strong className="text-slate-800">promotion_status</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Action Toolbar after Parsing: Preview Data & Column Mapping */}
      {selectedFile && cleaningReport && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-teal-50/70 to-emerald-50/70 border border-teal-200 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Data Ready for Review ({cleanedRecords.length} Valid Records)
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Data Quality: <strong>{cleaningReport.dataQualityPercentage}%</strong> •{' '}
              Duplicates: <strong>{cleaningReport.duplicateRecordsIdentified}</strong> •{' '}
              Rejected: <strong>{cleaningReport.invalidRecordsRejected}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {mappingResult && (
              <button
                type="button"
                onClick={() => setShowMappingModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Column Mappings</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-teal-300 text-teal-800 text-xs font-bold shadow-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-teal-600" />
              <span>Preview Data</span>
            </button>

            {showProceedButton && onProceedDirectly && (
              <button
                type="button"
                onClick={onProceedDirectly}
                disabled={!isDatasetReady}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <span>{proceedButtonLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Column Mapping Modal */}
      {mappingResult && (
        <ColumnMappingModal
          isOpen={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          mappingResult={mappingResult}
          onConfirmMapping={handleConfirmCustomMapping}
        />
      )}

      {/* Data Preview Modal */}
      {showPreviewModal && cleaningReport && (
        <CSVDataPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          rawRows={rawRows}
          cleanedRows={cleanedRecords}
          errors={validationErrors}
          report={cleaningReport}
          onProceedImport={(finalRecords) => {
            setCleanedRecords(finalRecords);
            onValidationSuccess({
              file: selectedFile,
              cleanedRecords: finalRecords,
              report: cleaningReport,
            });
            if (onProceedDirectly) {
              onProceedDirectly();
            }
          }}
          onUpdateRawRows={(updatedRaw) => {
            setRawRows(updatedRaw);
            const res = DataCleaningService.cleanDataset(updatedRaw, supermarketName, 'replace', []);
            setCleanedRecords(res.cleanedRecords);
            setCleaningReport(res.report);
            setValidationErrors(res.errors);
          }}
        />
      )}
    </div>
  );
};
