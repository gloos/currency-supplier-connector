import { Toaster } from "@/components/ui/toaster"; // Shadcn Toaster
import { Toaster as Sonner } from "@/components/ui/sonner"; // Sonner Toaster
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext"; // Import useAuth here
// Page Imports
// import Index from "./pages/Index"; // Likely not used directly in routing anymore
// import CreatePO from "./pages/CreatePO"; // Handled by nested routes
// import ViewPO from "./pages/ViewPO"; // Handled by nested routes
// import Dashboard from "./pages/Dashboard"; // Likely handled by nested routes or redirect
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
// Import Project Pages
import ProjectListPage from "./pages/ProjectListPage";
import ProjectNewPage from "./pages/ProjectNewPage";
// Import Supplier Portal Page
import SupplierPortalPage from "./pages/SupplierPortalPage";
// Component Imports (used in nested routes)
import POList from './components/purchase-order/po-list';
import { POForm } from './components/purchase-order/po-form';
import PODetail from './components/purchase-order/po-detail';
// Optional: Layout Component
// import MainLayout from './components/layout/MainLayout'; // Example if you create one
import MainLayout from './components/layout/MainLayout'; // Import the actual layout

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
  
  console.log("AppRoutes - Auth/Company loaded, rendering Routes...");

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

      {/* --- Supplier Portal Route (Public) --- */}
      <Route 
        path="/supplier/:token"
        element={<SupplierPortalPage />}
      />

      {/* Settings Page (Use Layout + Outlet + Nested Route) */}
      <Route
        path="/settings"
        element={
           user ? (
             <MainLayout>
               <Outlet /> {/* Use Outlet here */}
             </MainLayout>
           ) : (
             <Navigate to="/auth" replace state={{ from: location }} />
           )
        }
      >
        {/* Define nested route for Settings page */}
        <Route index element={<Settings />} />
      </Route>

      {/* Company-Specific Routes (Use Layout + Outlet + Nested Routes) */}
      <Route
        path="/company/:companySlug"
        element={
          !user ? ( 
            <Navigate to="/auth" replace state={{ from: location }} />
          ) : !user.company?.slug ? ( 
            <Navigate to="/settings" replace state={{ from: location, message: "Company association required." }} />
          ) : user.company.slug !== location.pathname.split('/')[2] ? (
            <Navigate to="/403" replace state={{ message: "Access denied."}} /> 
          ) : ( // User auth/company ok, render layout with outlet for children
            <MainLayout>
              <Outlet /> 
            </MainLayout>
          )
        }
      >
        {/* Define nested routes as children - these render in the Outlet */}
        <Route index element={<Navigate to="purchase-orders" replace />} />
        <Route path="purchase-orders" element={<POList />} />
        <Route path="purchase-orders/new" element={<POForm />} />
        <Route path="purchase-orders/:id" element={<PODetail />} />
        {/* Add Project Routes Here */}
        <Route path="projects" element={<ProjectListPage />} />
        <Route path="projects/new" element={<ProjectNewPage />} />
        {/* Add other company-specific routes here */}
        <Route path="*" element={<NotFound />} /> {/* Catch-all within company */}
      </Route> 

      {/* Catch-all 404 Not Found (Top Level) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;