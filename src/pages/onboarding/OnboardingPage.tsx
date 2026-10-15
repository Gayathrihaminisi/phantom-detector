import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  User,
  MapPin,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Check,
  FileCheck2,
  Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DataCleaningService } from '../../services/dataCleaningService';
import { CsvImportService } from '../../services/csvImportService';
import { CSVUploadZone } from '../../components/csv/CSVUploadZone';
import { ImportSummaryCard } from '../../components/csv/ImportSummaryCard';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    auth,
    settings,
    inventoryRecords,
    cleaningReport,
    setOnboardingStep,
    completeOnboarding,
    updateManagerProfile,
    importCSVFile,
    loadSimulatedDemoData,
    runRiskDetection,
  } = useApp();

  const currentStep = auth.currentOnboardingStep || 1;

  // Slide 2 form state
  const [storeName, setStoreName] = useState(settings.supermarketName || auth.manager?.supermarketName || '');
  const [storeLocation, setStoreLocation] = useState(settings.supermarketLocation || auth.manager?.supermarketLocation || '');
  const [contactNum, setContactNum] = useState(settings.contactNumber || auth.manager?.contactNumber || '');

  // Slide 3 & 4 state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingSuccess, setProcessingSuccess] = useState(false);

  // Sync state if manager profile loads
  useEffect(() => {
    if (auth.manager) {
      if (!storeName && auth.manager.supermarketName) setStoreName(auth.manager.supermarketName);
      if (!storeLocation && auth.manager.supermarketLocation) setStoreLocation(auth.manager.supermarketLocation);
      if (!contactNum && auth.manager.contactNumber) setContactNum(auth.manager.contactNumber);
    }
  }, [auth.manager]);

  const goToStep = (step: number) => {
    setOnboardingStep(step);
  };

  const handleConfirmStoreDetails = () => {
    updateManagerProfile({
      supermarketName: storeName.trim() || 'Supermarket Store',
      supermarketLocation: storeLocation.trim(),
      contactNumber: contactNum.trim(),
    });
    goToStep(3);
  };

  const stagesList = [
    'Reading CSV file content & headers',
    'Validating canonical column schema and synonyms',
    'Sanitizing quantities, trimming strings, and validating dates',
    'Scanning and filtering duplicate & conflicting records',
    'Preparing inventory baselines, daily sales gaps & trends',
    'Executing explainable risk detection engine',
  ];

  const handleRunProcessing = async (fileToProcess?: File) => {
    setIsProcessing(true);
    setProcessingError(null);
    setProcessingSuccess(false);
    goToStep(4);

    try {
      // Simulate stepped feedback for visual fidelity while executing real logic
      setProcessingStage(1);
      await new Promise((r) => setTimeout(r, 300));

      setProcessingStage(2);
      await new Promise((r) => setTimeout(r, 300));

      setProcessingStage(3);
      if (fileToProcess) {
        await importCSVFile(fileToProcess, 'replace');
      } else {
        await loadSimulatedDemoData();
      }

      setProcessingStage(4);
      await new Promise((r) => setTimeout(r, 250));

      setProcessingStage(5);
      await new Promise((r) => setTimeout(r, 250));

      setProcessingStage(6);
      runRiskDetection();
      await new Promise((r) => setTimeout(r, 350));

      setIsProcessing(false);
      setProcessingSuccess(true);
    } catch (err: any) {
      setIsProcessing(false);
      setProcessingError(err?.message || 'Failed to clean and process dataset. Please verify format.');
    }
  };

  const handleFinishOnboarding = () => {
    completeOnboarding();
    navigate('/dashboard');
  };

  const handleDownloadSample = () => {
    const csvContent = DataCleaningService.generateSampleCSVTemplate();
    CsvImportService.downloadFile(csvContent, 'supermarket_inventory_template.csv');
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="w-full max-w-3xl mx-auto mb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20">
            <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Phantom Stock-Out Detector</h1>
            <p className="text-[11px] text-teal-400 font-medium">
              {settings.supermarketName || auth.manager?.supermarketName || 'Supermarket Operations'}
            </p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === currentStep
                    ? 'bg-teal-400 text-slate-950 ring-2 ring-teal-400/30'
                    : step < currentStep
                    ? 'bg-teal-800 text-teal-200'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step < currentStep ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              {step < 4 && (
                <div
                  className={`w-6 h-0.5 mx-1 ${
                    step < currentStep ? 'bg-teal-700' : 'bg-slate-800'
                  }`}
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs font-semibold text-slate-400">Step {currentStep} of 4</span>
        </div>
      </div>

      {/* Main Slide Card Container */}
      <div className="w-full max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-8 sm:p-10 relative z-10 transition-all">
        {/* SLIDE 1: WELCOME */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shadow-sm">
              <Building2 className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-block px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold uppercase tracking-wider mb-2 border border-teal-200">
                Welcome to Phantom Stock-Out Detector
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Hello, {auth.manager?.fullName || 'Supermarket Manager'}!
              </h2>
              <p className="text-sm font-semibold text-teal-700 mt-1">
                Store: {settings.supermarketName || auth.manager?.supermarketName}
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Phantom stock-outs occur when products show positive quantities in your supermarket inventory database, but are actually absent from physical shelves due to misplaced items, unrecorded shrinkage, or delayed replenishment.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-800">1. Spot Anomaly Signals</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Detect sudden zero sales, velocity drops, and stock-demand disparities.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-800">2. Prioritize Top 20</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Focus staff inspections on the highest financial risk products daily.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-800">3. Protect Revenue in ₹</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Track estimated sales at risk and verify losses with shelf evidence.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => goToStep(2)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all"
              >
                <span>Proceed to Supermarket Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SLIDE 2: CONFIRM SUPERMARKET DETAILS */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shadow-sm">
              <Building2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Confirm Supermarket Profile
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                This profile organizes your uploaded inventory datasets, daily inspection priorities, alerts, and analytics.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Supermarket / Organization Name *</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Heritage Mart - Koramangala"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Store City or Branch Location</span>
                  </label>
                  <input
                    type="text"
                    value={storeLocation}
                    onChange={(e) => setStoreLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Bengaluru, Karnataka"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manager Contact Number</span>
                  </label>
                  <input
                    type="text"
                    value={contactNum}
                    onChange={(e) => setContactNum(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="+91 98450 12345"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={() => goToStep(1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={handleConfirmStoreDetails}
                disabled={!storeName.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                <span>Proceed to Data Upload</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SLIDE 3: UPLOAD SUPERMARKET DATA */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shadow-sm">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Upload Supermarket Inventory Data
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload your POS sales and closing stock records. The system will automatically detect columns, clean formats, and evaluate phantom stock-outs.
              </p>
            </div>

            {/* Reusable CSV Upload Zone */}
            <CSVUploadZone
              supermarketName={settings.supermarketName || auth.manager?.supermarketName || 'Supermarket Store'}
              onValidationSuccess={({ file, cleanedRecords }) => {
                if (file) setSelectedFile(file);
              }}
              onProceedDirectly={() => handleRunProcessing(selectedFile || undefined)}
              showProceedButton={true}
              proceedButtonLabel="Proceed to Clean & Analyze"
            />

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={() => goToStep(2)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={() => handleRunProcessing(selectedFile || undefined)}
                disabled={!selectedFile && inventoryRecords.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                <span>Proceed to Clean & Analyze</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SLIDE 4: DATA PREPARATION & REAL ANALYSIS */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shadow-sm">
              <FileCheck2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Data Cleaning & Risk Detection Engine
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Real-time validation, duplicate detection, baseline calculation, and explainable anomaly evaluation.
              </p>
            </div>

            {/* Stepped progress indicators */}
            <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {stagesList.map((stageName, idx) => {
                const stageNum = idx + 1;
                const isDone = processingSuccess || stageNum < processingStage;
                const isCurrent = isProcessing && stageNum === processingStage;

                return (
                  <div
                    key={stageNum}
                    className="flex items-center justify-between text-xs py-1 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-teal-600 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isDone ? <Check className="w-3 h-3" /> : stageNum}
                      </div>
                      <span
                        className={`font-medium ${
                          isDone
                            ? 'text-slate-800'
                            : isCurrent
                            ? 'text-teal-700 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {stageName}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold">
                      {isDone ? (
                        <span className="text-emerald-600">Completed</span>
                      ) : isCurrent ? (
                        <span className="text-teal-600">Processing...</span>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Error state */}
            {processingError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Processing Failed</span>
                </div>
                <p>{processingError}</p>
                <button
                  onClick={() => goToStep(3)}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Upload Another CSV File
                </button>
              </div>
            )}

            {/* Success Report State */}
            {processingSuccess && cleaningReport && (
              <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-emerald-950">
                      Dataset Cleaned & Analyzed Successfully!
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
                    Quality: {cleaningReport.dataQualityPercentage}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <p className="text-xs text-slate-500 font-medium">Valid Accepted</p>
                    <p className="text-base font-extrabold text-slate-900">
                      {cleaningReport.validAcceptedRecords}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <p className="text-xs text-slate-500 font-medium">Duplicates Handled</p>
                    <p className="text-base font-extrabold text-slate-900">
                      {cleaningReport.duplicateRecordsIdentified}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <p className="text-xs text-slate-500 font-medium">Records Corrected</p>
                    <p className="text-base font-extrabold text-slate-900">
                      {cleaningReport.recordsCorrected}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <p className="text-xs text-slate-500 font-medium">Rejected / Errors</p>
                    <p className="text-base font-extrabold text-slate-900">
                      {cleaningReport.invalidRecordsRejected}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-800">
                  Ready to inspect suspect products, monitor revenue at risk, and track shelf verification audits.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={() => goToStep(3)}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload Another File</span>
              </button>

              <button
                onClick={handleFinishOnboarding}
                disabled={!processingSuccess || isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                <span>Proceed to Supermarket Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
