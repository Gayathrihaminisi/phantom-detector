import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Building2,
  User,
  ShieldAlert,
  Bell,
  RotateCcw,
  Save,
  CheckCircle2,
  DollarSign,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_RISK_WEIGHTS, DEFAULT_RISK_THRESHOLDS } from '../../services/riskDetectionEngine';

export const SettingsPage: React.FC = () => {
  const { auth, settings, updateSettings, updateManagerProfile, runRiskDetection } = useApp();

  // Profile form
  const [managerName, setManagerName] = useState(auth.manager?.fullName || '');
  const [storeName, setStoreName] = useState(settings.supermarketName);
  const [storeLocation, setStoreLocation] = useState(settings.supermarketLocation);
  const [contactNumber, setContactNumber] = useState(settings.contactNumber);

  // Risk Weights
  const [weights, setWeights] = useState({ ...settings.riskWeights });

  // Thresholds
  const [thresholds, setThresholds] = useState({ ...settings.riskThresholds });

  // Window
  const [obsWindow, setObsWindow] = useState(settings.observationWindowDays);

  // Toggles
  const [autoAnalyze, setAutoAnalyze] = useState(settings.autoAnalyzeOnImport);
  const [notifsEnabled, setNotifsEnabled] = useState(settings.notificationsEnabled);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Update Profile
    updateManagerProfile({
      fullName: managerName.trim(),
      supermarketName: storeName.trim(),
      supermarketLocation: storeLocation.trim(),
      contactNumber: contactNumber.trim(),
    });

    // Update System Settings
    updateSettings({
      supermarketName: storeName.trim(),
      supermarketLocation: storeLocation.trim(),
      contactNumber: contactNumber.trim(),
      riskWeights: weights,
      riskThresholds: thresholds,
      observationWindowDays: obsWindow,
      autoAnalyzeOnImport: autoAnalyze,
      notificationsEnabled: notifsEnabled,
    });

    // Re-run risk engine with new weights/thresholds
    runRiskDetection();

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    setWeights({ ...DEFAULT_RISK_WEIGHTS });
    setThresholds({ ...DEFAULT_RISK_THRESHOLDS });
    setObsWindow(7);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            System & Risk Engine Settings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure explainable risk factor weights, category thresholds, supermarket profile, and operational preferences.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings updated & risk re-calculated!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="card-subtle p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Supermarket Organization Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supermarket / Chain Name *
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Store Location / Headquarter Branch
              </label>
              <input
                type="text"
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Manager Full Name
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contact Number
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Explainable Risk Factor Weights (Section 7.1) */}
        <div className="card-subtle p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Explainable Risk Engine Factor Weights
              </h3>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-teal-600 hover:underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Factory Defaults</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Customize the contribution points awarded when specific sales velocity anomalies or stock-demand inconsistencies are detected.
          </p>

          <div className="space-y-4 pt-1 text-xs">
            {/* Factor 1: Unexpected zero sales */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800">
                  Unexpected Zero Sales (Default: 30)
                </span>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {weights.unexpectedZeroSales} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Positive book stock on record, but recent customer checkout sales are zero despite regular demand.
              </p>
              <input
                type="range"
                min="10"
                max="50"
                value={weights.unexpectedZeroSales}
                onChange={(e) => setWeights({ ...weights, unexpectedZeroSales: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-600"
              />
            </div>

            {/* Factor 2: Sales slowdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800">
                  Sales Velocity Slowdown (Default: 25)
                </span>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {weights.salesSlowdown} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Recent daily sales velocity dropped by &gt;50% compared with historical daily baseline.
              </p>
              <input
                type="range"
                min="10"
                max="40"
                value={weights.salesSlowdown}
                onChange={(e) => setWeights({ ...weights, salesSlowdown: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-600"
              />
            </div>

            {/* Factor 3: Stock-demand inconsistency */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800">
                  Stock-Demand Disparity (Default: 20)
                </span>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {weights.stockDemandInconsistency} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Book stock indicates abundant units, but observed sales are under 25% of expected capacity.
              </p>
              <input
                type="range"
                min="5"
                max="35"
                value={weights.stockDemandInconsistency}
                onChange={(e) => setWeights({ ...weights, stockDemandInconsistency: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-600"
              />
            </div>

            {/* Factor 4: Last-sale anomaly */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800">
                  Extended Inactivity Anomaly (Default: 15)
                </span>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {weights.lastSaleAnomaly} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Days since last recorded sale significantly exceeds standard selling frequency interval.
              </p>
              <input
                type="range"
                min="5"
                max="30"
                value={weights.lastSaleAnomaly}
                onChange={(e) => setWeights({ ...weights, lastSaleAnomaly: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-600"
              />
            </div>

            {/* Factor 5: Promotion or high-demand signal */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800">
                  Promoted or Fast-Mover Stoppage (Default: 10)
                </span>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {weights.promotionSignal} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Promoted product or top tier fast mover has zero sales despite positive inventory count.
              </p>
              <input
                type="range"
                min="5"
                max="25"
                value={weights.promotionSignal}
                onChange={(e) => setWeights({ ...weights, promotionSignal: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-600"
              />
            </div>
          </div>
        </div>

        {/* Risk Thresholds & Currency Standard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Thresholds Card */}
          <div className="card-subtle p-6 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-teal-600" />
              <span>Risk Classification Thresholds</span>
            </h4>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">
                  Critical Risk Minimum Score (Default: 80)
                </label>
                <input
                  type="number"
                  min="70"
                  max="95"
                  value={thresholds.critical}
                  onChange={(e) => setThresholds({ ...thresholds, critical: parseInt(e.target.value, 10) || 80 })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-red-600"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  High Risk Minimum Score (Default: 60)
                </label>
                <input
                  type="number"
                  min="50"
                  max="79"
                  value={thresholds.high}
                  onChange={(e) => setThresholds({ ...thresholds, high: parseInt(e.target.value, 10) || 60 })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-orange-600"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  Medium Risk Minimum Score (Default: 35)
                </label>
                <input
                  type="number"
                  min="20"
                  max="59"
                  value={thresholds.medium}
                  onChange={(e) => setThresholds({ ...thresholds, medium: parseInt(e.target.value, 10) || 35 })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Currency & Financial Standards */}
          <div className="card-subtle p-6 space-y-3 bg-slate-50/50">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-teal-600" />
              <span>Indian Currency & Financial Standard</span>
            </h4>
            <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Monetary Unit</span>
              <p className="font-bold text-slate-900">Indian Rupee (INR — ₹)</p>
              <p className="text-[11px] text-slate-500">
                Fixed to INR (₹) using <code>en-IN</code> localization formatting standard throughout all reports, charts, and exports.
              </p>
            </div>

            <div className="text-xs space-y-2 pt-1">
              <label className="block text-slate-600">
                Estimated Sales Anomaly Window Cap (Days):
              </label>
              <input
                type="number"
                min="3"
                max="30"
                value={obsWindow}
                onChange={(e) => setObsWindow(parseInt(e.target.value, 10) || 7)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-400">
                Caps the maximum number of anomaly days multiplied in sales-at-risk formula.
              </p>
            </div>
          </div>
        </div>

        {/* Save button footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings & Recalculate Risk</span>
          </button>
        </div>
      </form>
    </div>
  );
};
