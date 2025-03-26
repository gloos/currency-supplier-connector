
import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/navbar";
import POList from "@/components/purchase-order/po-list";
import BlurCard from "@/components/ui/blur-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Check, Clock, AlertTriangle } from "lucide-react";

const Dashboard = () => {
  // Mock stats for demo purposes
  const stats = [
    { label: "Total POs", value: "12", icon: <FileText size={18} /> },
    { label: "Completed", value: "5", icon: <Check size={18} /> },
    { label: "Pending", value: "7", icon: <Clock size={18} /> },
    { label: "Issues", value: "0", icon: <AlertTriangle size={18} /> },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      <main className="page-container">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card 
              key={stat.label}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <BlurCard className="p-6 w-full md:w-1/3 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex flex-col h-full">
              <h2 className="font-display text-xl font-medium mb-4">
                Quick Actions
              </h2>
              
              <div className="space-y-3 mt-2">
                <Button asChild className="w-full justify-start">
                  <Link to="/create-po">
                    <Plus size={16} className="mr-2" />
                    New Purchase Order
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link to="/purchase-orders">
                    <FileText size={16} className="mr-2" />
                    View All Purchase Orders
                  </Link>
                </Button>
              </div>
            </div>
          </BlurCard>
          
          <BlurCard className="p-6 w-full md:w-2/3 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="flex flex-col h-full">
              <h2 className="font-display text-xl font-medium mb-4">
                FreeAgent Status
              </h2>
              
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  Connect to FreeAgent to view your account status
                </div>
                <Button asChild>
                  <Link to="/settings">Configure FreeAgent</Link>
                </Button>
              </div>
            </div>
          </BlurCard>
        </div>
        
        <div className="animate-slide-up" style={{ animationDelay: "400ms" }}>
          <POList />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
