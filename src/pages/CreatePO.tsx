
import React, { useState } from "react";
import Navbar from "@/components/layout/navbar";
import POForm from "@/components/purchase-order/po-form";
import ContactsList from "@/components/freeagent/contacts-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users } from "lucide-react";

const CreatePO = () => {
  const [activeTab, setActiveTab] = useState("create-po");
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      <main className="page-container">
        <div className="page-header">
          <h1 className="page-title">Purchase Orders</h1>
        </div>
        
        <div className="animate-fade-in">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="create-po" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Create PO
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Contacts
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="create-po" className="mt-0">
              <POForm />
            </TabsContent>
            
            <TabsContent value="contacts" className="mt-0">
              <ContactsList />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CreatePO;
