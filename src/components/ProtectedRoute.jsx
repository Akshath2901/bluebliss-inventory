// apps/inventory/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", background:"var(--inv-bg)", color:"var(--inv-primary)",
      fontFamily:"var(--font-label)", fontSize:"11px", letterSpacing:"3px" }}>
      LOADING…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}