import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import TeamOverview from './pages/TeamOverview';
import OrganizationStructure from './pages/OrganizationStructure';
import PerformanceAlertsPage from './pages/PerformanceAlertsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { ScoreLevelProvider } from './contexts/ScoreLevelContext';
import { WatermarkProvider } from './contexts/WatermarkContext';
import Watermark from './components/Watermark';
import { Role } from './types/auth';

function App() {
  return (
    <ScoreLevelProvider>
      <WatermarkProvider>
        <Watermark />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team-overview"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DIRECTOR]}>
              <TeamOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DIRECTOR]}>
              <OrganizationStructure />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance-alerts"
          element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.DIRECTOR, Role.HR]}>
              <PerformanceAlertsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </WatermarkProvider>
    </ScoreLevelProvider>
  );
}

export default App;
