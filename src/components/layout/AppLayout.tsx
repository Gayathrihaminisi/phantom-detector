import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { useApp } from '../../context/AppContext';
import { AlertCircle, Database } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { auth, isMemoryOnlyStorage, inventoryRecords } = useApp();

  // If not authenticated, redirect to login
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If onboarding not completed, redirect to onboarding flow
  if (!auth.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNavbar />

        {/* Memory Only Storage Banner */}
        {isMemoryOnlyStorage && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Session Memory Mode:</strong> Inventory dataset exceeds browser LocalStorage quota. Cleaned data is retained in memory for this session.
              </span>
            </div>
            <span className="font-semibold text-amber-700">Safe In-Memory Session</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/70">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
