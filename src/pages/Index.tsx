
import React from "react";
import { Link } from "react-router-dom";
import BlurCard from "@/components/ui/blur-card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/navbar";
import POList from "@/components/purchase-order/po-list";
import { FileText, Plus, Settings } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      <main className="page-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <BlurCard className="p-6 col-span-1 md:col-span-2 animate-slide-up">
            <div className="flex flex-col h-full">
              <h1 className="font-display text-3xl font-bold tracking-tight mb-4">
                Purchase Order System
              </h1>
              <p className="text-muted-foreground mb-6">
                Create, send, and track purchase orders with integrated FreeAgent billing
              </p>
              
              <div className="mt-auto flex flex-wrap gap-4">
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/create-po">
                    <Plus size={16} className="mr-2" />
                    Create New Purchase Order
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link to="/purchase-orders">
                    <FileText size={16} className="mr-2" />
                    View All Purchase Orders
                  </Link>
                </Button>
              </div>
            </div>
          </BlurCard>
          
          <BlurCard className="p-6 col-span-1 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-col h-full">
              <h2 className="font-display text-xl font-medium mb-2">
                Quick Actions
              </h2>
              <div className="text-sm text-muted-foreground mb-6">
                Common tasks and settings
              </div>
              
              <div className="space-y-2 mt-auto">
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/create-po">
                    <Plus size={16} className="mr-2" />
                    New Purchase Order
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/settings">
                    <Settings size={16} className="mr-2" />
                    FreeAgent Settings
                  </Link>
                </Button>
              </div>
            </div>
          </BlurCard>
        </div>
        
        <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <POList />
        </div>
      </main>
    </div>
  );
};

export default Index;
