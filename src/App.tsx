import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import CreatePO from "./pages/CreatePO";
import ViewPO from "./pages/ViewPO";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import POList from './components/purchase-order/po-list';
import POForm from './components/purchase-order/po-form';
import PODetail from './components/purchase-order/po-detail';
import { useAuth } from '@/contexts/AuthContext';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

const AppRoutes = () => {
  const { user, loading } = useAuth();

  console.log('AppRoutes - Current state:', {
    loading,
    isAuthenticated: !!user,
    hasCompany: !!user?.company,
    companySlug: user?.company?.slug
  });

  if (loading) {
    console.log('AppRoutes - Still loading auth state');
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user ? (
            user.company?.slug ? (
              <Navigate to={`/company/${user.company.slug}/purchase-orders`} replace />
            ) : (
              <Navigate to="/settings" replace />
            )
          ) : (
            <Navigate to="/auth" replace />
          )
        } 
      />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/settings" element={user ? <Settings /> : <Navigate to="/auth" replace />} />
      
      {/* Protected company routes */}
      <Route path="/company/:companySlug">
        <Route path="purchase-orders" element={
          !user ? (
            <Navigate to="/auth" replace />
          ) : !user.company?.slug ? (
            <Navigate to="/settings" replace />
          ) : (
            <POList />
          )
        } />
        <Route path="purchase-orders/new" element={
          !user ? (
            <Navigate to="/auth" replace />
          ) : !user.company?.slug ? (
            <Navigate to="/settings" replace />
          ) : (
            <POForm />
          )
        } />
        <Route path="purchase-orders/:id" element={
          !user ? (
            <Navigate to="/auth" replace />
          ) : !user.company?.slug ? (
            <Navigate to="/settings" replace />
          ) : (
            <PODetail />
          )
        } />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
