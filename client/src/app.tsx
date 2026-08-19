import React, { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import NotFound from './pages/NotFound/NotFound';

const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const MaterialsPage = lazy(() => import('./pages/Materials/MaterialsPage'));
const MaterialDetailPage = lazy(() => import('./pages/Materials/MaterialDetailPage'));
const PurchasePage = lazy(() => import('./pages/Purchase/PurchasePage'));
const ResearchPage = lazy(() => import('./pages/Research/ResearchPage'));
const ProtocolsPage = lazy(() => import('./pages/Protocols/ProtocolsPage'));
const ProtocolDetailPage = lazy(() => import('./pages/Protocols/ProtocolDetailPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));

const RoutesComponent = () => {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* App routes */}
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/materials" replace />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/materials/:id" element={<MaterialDetailPage />} />
        <Route path="/purchase" element={<PurchasePage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/protocols" element={<ProtocolsPage />} />
        <Route path="/protocols/:id" element={<ProtocolDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
