import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute() {
  // Check if the user is logged in
  const isLoggedIn = !!localStorage.getItem('access_token');

  if (isLoggedIn) {
    // If logged in, render the child component
    return <Outlet />;
  } else {
    // If not logged in, redirect to the /login page
    return <Navigate to="/login" replace />;
  }
}

export default ProtectedRoute;