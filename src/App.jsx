// apps/inventory/src/App.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import InvLayout from './components/layout/InvLayout.jsx';
import Login from './pages/Login/Login.jsx';

const Dashboard      = lazy(() => import('./pages/Dashboard/Dashboard.jsx'));
const Stock          = lazy(() => import('./pages/Stock/Stock.jsx'));
const Usage          = lazy(() => import('./pages/Usage/Usage.jsx'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders/PurchaseOrders.jsx'));
const Waste          = lazy(() => import('./pages/Waste/Waste.jsx'));
const Suppliers      = lazy(() => import('./pages/Suppliers/Suppliers.jsx'));
const CostAnalysis   = lazy(() => import('./pages/CostAnalysis/CostAnalysis.jsx'));
const Reports        = lazy(() => import('./pages/Reports/Reports.jsx'));
const AIInsights     = lazy(() => import('./pages/AIInsights/AIInsights.jsx'));
const Staff        = lazy(() => import('./pages/Staff/Staff.jsx'));
const SeedPage     = lazy(() => import('./pages/Seed/SeedPage.jsx'));
const PetpoojaSync   = lazy(() => import('./pages/PetpoojaSync/PetpoojaSync.jsx'));

const Loading = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    height:'100vh', background:'var(--inv-bg)', color:'var(--inv-primary)',
    fontFamily:'var(--font-label)', fontSize:'11px', letterSpacing:'3px' }}>
    LOADING…
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Loading/>}>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/seed" element={<SeedPage/>}/>
          <Route path="/" element={<ProtectedRoute><InvLayout/></ProtectedRoute>}>
            <Route index                  element={<Dashboard/>}/>
            <Route path="stock"           element={<Stock/>}/>
            <Route path="usage"           element={<Usage/>}/>
            <Route path="purchase-orders" element={<PurchaseOrders/>}/>
            <Route path="waste"           element={<Waste/>}/>
            <Route path="suppliers"       element={<Suppliers/>}/>
            <Route path="cost"            element={<CostAnalysis/>}/>
            <Route path="reports"         element={<Reports/>}/>
            <Route path="ai"              element={<AIInsights/>}/>
            <Route path="staff"          element={<Staff/>}/>
          <Route path="sync"            element={<PetpoojaSync/>}/>
          </Route>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}