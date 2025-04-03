import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext'; // Ensure correct path

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireCompany?: boolean; // Optional prop to enforce company check
};

const ProtectedRoute = ({ children, requireCompany = false }: ProtectedRouteProps) => {
  // Get all relevant states from AuthContext
  const { user, loadingAuth, loadingCompany } = useAuth();
  const location = useLocation();

  // Show loading indicator if either auth session or company info is still loading
  // This prevents rendering children prematurely before state is known
  if (loadingAuth || loadingCompany) {
    console.log("ProtectedRoute: Waiting for auth/company data...");
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading User Data...</div>
      </div>
    );
  }

  // If loading is finished, check authentication
  if (!user) {
    console.log("ProtectedRoute: User not authenticated, redirecting to auth.");
    // Redirect them to the /auth page, but save the current location they were
    // trying to go to in the state, so we can send them back there after login.
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Optional: Check if company association is required and missing
  if (requireCompany && !user.company?.slug) {
      console.warn("ProtectedRoute: User authenticated but company association missing/required, redirecting to settings.");
      return <Navigate to="/settings" state={{ from: location, message: "Company association is required for this page." }} replace />;
  }


  // If all checks pass, render the requested component/page
  console.log("ProtectedRoute: All checks passed, rendering children.");
  return <>{children}</>;
};

export default ProtectedRoute;