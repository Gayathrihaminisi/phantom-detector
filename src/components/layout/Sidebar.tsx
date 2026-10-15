import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  AlertTriangle,
  BarChart3,
  History,
  Database,
  Upload,
  Settings,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { auth, settings, alerts, dashboardKPIs } = useApp();
  const unackAlerts = alerts.filter((a) => !a.acknowledged).length;

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/inventory',
      label: 'Inventory Analysis',
      icon: Boxes,
      badge: dashboardKPIs.totalProductsMonitored > 0 ? dashboardKPIs.totalProductsMonitored.toString() : undefined,
    },
    {
      to: '/inspections/top20',
      label: 'Top 20 Inspections',
      icon: ClipboardList,
      badge: 'Priority',
      badgeColor: 'bg-red-100 text-red-700',
    },
    {
      to: '/alerts',
      label: 'Risk Alerts',
      icon: AlertTriangle,
      badge: unackAlerts > 0 ? unackAlerts.toString() : undefined,
      badgeColor: 'bg-orange-100 text-orange-700',
    },
    {
      to: '/analytics',
      label: 'Analytics & Reports',
      icon: BarChart3,
    },
    {
      to: '/inspections/history',
      label: 'Inspection History',
      icon: History,
      badge: dashboardKPIs.confirmedDiscrepancies > 0 ? `${dashboardKPIs.confirmedDiscrepancies} verified` : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      to: '/csv-upload',
      label: 'CSV Upload & Clean',
      icon: Upload,
      badge: 'Easy Import',
      badgeColor: 'bg-teal-900 text-teal-300',
    },
    {
      to: '/data-management',
      label: 'Data Management',
      icon: Database,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
          <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
            Phantom Stock-Out
          </h1>
          <p className="text-[11px] text-teal-400 font-medium">Risk Detector AI</p>
        </div>
      </div>

      {/* Supermarket Profile Card */}
      <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-slate-800/70 border border-slate-700/60">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-300">
            Registered Supermarket
          </span>
        </div>
        <p className="text-xs font-semibold text-white truncate" title={settings.supermarketName}>
          {settings.supermarketName || auth.manager?.supermarketName || 'Supermarket Org'}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {settings.supermarketLocation || auth.manager?.supermarketLocation || 'Store Network'}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Supermarket Operations
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 font-semibold border-l-2 border-teal-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Engine Tagline */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 font-medium">Detection Engine</span>
          <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Rule-Based Active
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          Indian Rupee (₹) Financial Risk Standard
        </p>
      </div>
    </aside>
  );
};
