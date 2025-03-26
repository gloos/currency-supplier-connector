
import React from "react";
import Navbar from "@/components/layout/navbar";
import PODetail from "@/components/purchase-order/po-detail";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const ViewPO = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        
        <main className="page-container">
          <div className="animate-fade-in">
            <PODetail />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default ViewPO;
