
import React from "react";
import Navbar from "@/components/layout/navbar";
import POForm from "@/components/purchase-order/po-form";

const CreatePO = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      <main className="page-container">
        <div className="page-header">
          <h1 className="page-title">Create Purchase Order</h1>
        </div>
        
        <div className="animate-fade-in">
          <POForm />
        </div>
      </main>
    </div>
  );
};

export default CreatePO;
