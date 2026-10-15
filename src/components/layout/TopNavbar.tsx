import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  Building2,
  User,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TopNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    auth,
    settings,
    logout,
    inventoryRecords,
    selectedStoreFilter,
    setSelectedStoreFilter,
    runRiskDetection,
    isAnalyzing,
    detectionState,
    alerts,
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Derive unique store IDs and names from dataset
  const storeOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    inventoryRecords.forEach((r) => {
      if (r.store_id) {
        map.set(r.store_id, r.store_location || r.store_id);
      }
    });
    return Array.from(map.entries());
  }, [inventoryRecords]);

  // Determine page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return { title: 'Operational Dashboard', section: 'Overview' };
    if (path.includes('/inventory')) return { title: 'Supermarket Inventory Analysis', section: 'Catalog' };
    if (path.includes('/inspections/top20')) return { title: 'Top 20 Shelf Inspections', section: 'Prioritization' };
    if (path.includes('/alerts')) return { title: 'Risk Discrepancy Alerts', section: 'Monitoring' };
    if (path.includes('/analytics')) return { title: 'Financial & Inventory Analytics', section: 'Reports' };
    if (path.includes('/inspections/history')) return { title: 'Physical Shelf Inspection History', section: 'Audits' };
    if (path.includes('/data-management')) return { title: 'Dataset & Import Management', section: 'Data' };
    if (path.includes('/settings')) return { title: 'Risk Engine & System Settings', section: 'Configuration' };
    return { title: 'Phantom Stock-Out Detector', section: 'App' };
  };

  const pageInfo = getPageTitle();
  const unreadAlerts = alerts.filter((a) => !a.acknowledged);

  const handleRunDetection = async () => {
    try {
      await runRiskDetection();
    } catch {
      // Error handled by central detection state in AppContext
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shrink-0">
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span>{pageInfo.section}</span>
            <span>/</span>
            <span className="text-teal-700 font-semibold">{pageInfo.title}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
            {pageInfo.title}
          </h2>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-3">
        {/* Run Risk Engine Button with proper states */}
        <button
          onClick={handleRunDetection}
          disabled={detectionState === 'running'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            detectionState === 'running'
              ? 'bg-amber-600 text-white animate-pulse'
              : detectionState === 'error'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
          title="Run explainable anomaly detection engine"
        >
          <PlayCircle className={`w-3.5 h-3.5 ${detectionState === 'running' ? 'animate-spin' : ''}`} />
          <span>
            {detectionState === 'running'
              ? 'Analysing inventory...'
              : detectionState === 'error'
              ? 'Retry Detection'
              : 'Run Risk Detection'}
          </span>
        </button>

        {/* Store Location Selector */}
        {storeOptions.length > 1 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stores ({storeOptions.length} Branches)</option>
              {storeOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Supermarket Name Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-teal-600" />
          <span className="max-w-[180px] truncate" title={settings.supermarketName}>
            {settings.supermarketName}
          </span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Alerts ({unreadAlerts.length})
                </h4>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/alerts');
                  }}
                  className="text-[11px] text-teal-600 hover:underline font-semibold"
                >
                  View All
                </button>
              </div>
              <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                {unreadAlerts.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No unacknowledged alerts.
                  </p>
                ) : (
                  unreadAlerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {alert.product_name}
                        </span>
                        <span className="text-[10px] font-bold text-red-600 uppercase">
                          {alert.risk_level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {alert.detected_anomaly}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Manager Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {auth.manager?.fullName ? auth.manager.fullName.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {auth.manager?.fullName || 'Manager'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">Store Manager</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{auth.manager?.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{auth.manager?.email}</p>
                <p className="text-[10px] text-teal-600 font-medium mt-1 truncate">
                  {settings.supermarketName}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left font-medium"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Profile & Settings</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
