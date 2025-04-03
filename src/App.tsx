import { Toaster } from "@/components/ui/toaster"; // Shadcn Toaster
import { Toaster as Sonner } from "@/components/ui/sonner"; // Sonner Toaster
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext"; // Import useAuth here
// Page Imports
// import Index from "./pages/Index"; // Likely not used directly in routing anymore
// import CreatePO from "./pages/CreatePO"; // Handled by nested routes
// import ViewPO from "./pages/ViewPO"; // Handled by nested routes
// import Dashboard from "./pages/Dashboard"; // Likely handled by nested routes or redirect
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
// Component Imports (used in nested routes)
import POList from './components/purchase-order/po-list';
import POForm from './components/purchase-order/po-form';
import PODetail from './components/purchase-order/po-detail';
// Optional: Layout Component
// import MainLayout from './components/layout/MainLayout'; // Example if you create one

const queryClient = new QueryClient();

// Main App component wrapping Providers
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider> {/* AuthProvider wraps everything */}
          <Toaster /> {/* Shadcn Toaster */}
          <Sonner /> {/* Sonner Toaster */}
          <Router>
            <AppRoutes /> {/* Component handling route logic */}
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// Simple Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    <span className="sr-only">Loading...</span>
  </div>
);

// Component responsible for defining routes based on auth state
const AppRoutes = () => {
  // Get loading states and user from AuthContext
  const { user, loadingAuth, loadingCompany } = useAuth();
  const location = useLocation(); // Get location for passing state in redirects

  console.log('AppRoutes - Evaluating Routes:', {
    loadingAuth,
    loadingCompany,
    pathname: location.pathname,
    isAuthenticated: !!user,
    hasCompany: !!user?.company,
    companySlug: user?.company?.slug
  });

  // Show loading spinner if initial auth OR company data is still loading
  if (loadingAuth || loadingCompany) {
    console.log('AppRoutes - Waiting for auth/company data...');
    return <LoadingSpinner />;
  }

  // --- Routing Logic (executes only when loading is false) ---
  return (
    <Routes>
      {/* Root Path Logic */}
      <Route
        path="/"
        element={
          user ? ( // User is authenticated
            user.company?.slug ? ( // And company is linked
              // Redirect to the company's default page (PO list)
              <Navigate to={`/company/${user.company.slug}/purchase-orders`} replace />
            ) : ( // Authenticated but no company linked
              // Redirect to settings, maybe pass a message
              <Navigate to="/settings" replace state={{ message: "Please complete company setup." }} />
            )
          ) : ( // Not authenticated
            <Navigate to="/auth" replace />
          )
        }
      />

      {/* Authentication Page */}
      <Route
         path="/auth"
         // If already logged in (and finished loading), redirect away from auth page
         element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />

      {/* Settings Page (Requires Auth, but not necessarily Company Link) */}
      <Route
        path="/settings"
        element={user ? <Settings /> : <Navigate to="/auth" replace state={{ from: location }} />}
      />

      {/* Company-Specific Routes (Requires Auth AND Company Link) */}
      <Route
        path="/company/:companySlug/*" // Use wildcard for nested routes
        element={
          !user ? ( // Needs auth? Redirect to auth
            <Navigate to="/auth" replace state={{ from: location }} />
          ) : !user.company?.slug ? ( // Needs company link? Redirect to settings
            <Navigate to="/settings" replace state={{ from: location, message: "Company association required for this section." }} />
          ) : user.company.slug !== location.pathname.split('/')[2] ? ( // Belongs to THIS company? (Basic check)
            // This prevents accessing /company/other-slug/... if user belongs to 'my-slug'
            // More robust checks might happen inside CompanyRoutes if needed
            <Navigate to="/403" replace state={{ message: "Access denied to this company."}} /> // Or a specific "Forbidden" page
          ) : ( // User has auth and is linked to a company, render nested routes
            <CompanyRoutes />
          )
        }
      />

      {/* Catch-all 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// --- Nested Routes Component for Company Section ---
// This component renders only if the user is authenticated AND associated with a company
const CompanyRoutes = () => {
    console.log("Rendering CompanyRoutes...");
    // Optional: Add a layout wrapper specifically for company pages here
    // e.g., <CompanyLayout> <Routes> ... </Routes> </CompanyLayout>
    return (
        <Routes>
             {/* Default route within /company/:slug might be the list */}
             <Route index element={<Navigate to="purchase-orders" replace />} />
             <Route path="purchase-orders" element={<POList />} />
             <Route path="purchase-orders/new" element={<POForm />} />
             <Route path="purchase-orders/:id" element={<PODetail />} />
             {/* Add other company-specific routes: /dashboard, /users, etc. */}
             {/* <Route path="dashboard" element={<CompanyDashboard />} /> */}

             {/* Catch-all within the company scope */}
             <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;