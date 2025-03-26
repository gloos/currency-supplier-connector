
import { toast } from "sonner";

interface FreeAgentCredentials {
  apiKey: string;
  accessToken: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
}

interface PurchaseOrder {
  id: string;
  supplierRef: string;
  reference: string;
  currencyCode: string;
  issueDate: string;
  items: PurchaseOrderItem[];
  total: number;
}

interface PurchaseOrderItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Bill {
  reference: string;
  dated_on: string;
  due_on: string;
  currency: string;
  supplier_id: string;
  total_value: number;
  status: "Draft" | "Open" | "Scheduled" | "Paid";
}

// This is a placeholder implementation. In a real app, this would connect to the FreeAgent API
export const freeAgentApi = {
  credentials: null as FreeAgentCredentials | null,
  
  init(credentials: FreeAgentCredentials) {
    this.credentials = credentials;
    console.log("FreeAgent API initialized with credentials", credentials);
    return this;
  },
  
  getSuppliers(): Promise<Supplier[]> {
    // Simulate API call
    console.log("Fetching suppliers from FreeAgent...");
    
    // Mock data
    return Promise.resolve([
      { id: "sup_1", name: "ABC Supplier Ltd", email: "accounts@abcsupplier.com" },
      { id: "sup_2", name: "XYZ Corporation", email: "billing@xyzcorp.com" },
      { id: "sup_3", name: "Global Imports", email: "finance@globalimports.com" },
    ]);
  },
  
  async createBill(purchaseOrder: PurchaseOrder): Promise<Bill> {
    if (!this.credentials) {
      throw new Error("FreeAgent API not initialized");
    }
    
    // In a real app, this would send a request to the FreeAgent API
    console.log("Creating bill in FreeAgent for PO:", purchaseOrder);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const bill: Bill = {
        reference: purchaseOrder.reference,
        dated_on: new Date().toISOString().split('T')[0],
        due_on: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: purchaseOrder.currencyCode,
        supplier_id: purchaseOrder.supplierRef,
        total_value: purchaseOrder.total,
        status: "Draft"
      };
      
      toast.success("Bill created in FreeAgent", {
        description: `Reference: ${bill.reference}`
      });
      
      return bill;
    } catch (error) {
      console.error("Error creating bill in FreeAgent:", error);
      toast.error("Failed to create bill in FreeAgent");
      throw error;
    }
  }
};
