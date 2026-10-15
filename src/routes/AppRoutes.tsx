import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { OnboardingPage } from '../pages/onboarding/OnboardingPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { InventoryAnalysisPage } from '../pages/inventory/InventoryAnalysisPage';
import { Top20InspectionsPage } from '../pages/inspections/Top20InspectionsPage';
import { RiskAlertsPage } from '../pages/alerts/RiskAlertsPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { InspectionHistoryPage } from '../pages/inspections/InspectionHistoryPage';
import { DataManagementPage } from '../pages/data-management/DataManagementPage';
import { CSVUploadPage } from '../pages/csv-upload/CSVUploadPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { useApp } from '../context/AppContext';

// Protected Route Guard for Onboarding
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth } = useApp();
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { auth, inventoryRecords } = useApp();

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          auth.isAuthenticated ? (
            auth.onboardingCompleted ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/register"
        element={
          auth.isAuthenticated ? (
            <Navigate to="/onboarding" replace />
          ) : (
            <RegisterPage />
          )
        }
      />

      {/* Guided Slide Onboarding */}
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        }
      />

      {/* Main Protected Application */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryAnalysisPage />} />
        <Route path="/inspections/top20" element={<Top20InspectionsPage />} />
        <Route path="/alerts" element={<RiskAlertsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/inspections/history" element={<InspectionHistoryPage />} />
        <Route path="/csv-upload" element={<CSVUploadPage />} />
        <Route path="/data-management" element={<DataManagementPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Root redirection */}
      <Route
        path="/"
        element={
          auth.isAuthenticated ? (
            auth.onboardingCompleted ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
