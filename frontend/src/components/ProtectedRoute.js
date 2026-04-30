import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ staffOnly = false }) {
  const { user, authLoading } = useAuth();

  // Wait until auth state is resolved — avoids flash-redirect on page load
  if (authLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  // Staff-only routes redirect non-admins to home instead of login
  if (staffOnly && !user.is_staff) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default ProtectedRoute;
