
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FreeAgentCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
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

// Database table interfaces
interface FreeAgentCredentialsTable {
  id: number;
  client_id: string;
  client_secret: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PreferencesTable {
  id: number;
  auto_create_bills: boolean;
  default_currency: string;
  created_at: string | null;
  updated_at: string | null;
}

// Updated OAuth URLs based on FreeAgent API documentation
const FREEAGENT_AUTH_URL = "https://api.sandbox.freeagent.com/v2/approve_app";
const FREEAGENT_API_URL = "https://api.sandbox.freeagent.com/v2";
const FREEAGENT_TOKEN_URL = "https://api.sandbox.freeagent.com/v2/token_endpoint";

// Dynamically get the redirect URI based on the current origin
const getRedirectUri = () => {
  return `${window.location.origin}/settings`;
};

// This is a placeholder implementation with OAuth2 flow for FreeAgent
export const freeAgentApi = {
  credentials: null as FreeAgentCredentials | null,
  
  init(credentials: FreeAgentCredentials) {
    this.credentials = credentials;
    console.log("FreeAgent API initialized with credentials", credentials);
    return this;
  },
  
  // Get the stored credentials from localStorage or initialize empty
  async loadCredentials(): Promise<FreeAgentCredentials | null> {
    const { data, error } = await supabase
      .from('freeagent_credentials')
      .select('*')
      .maybeSingle();
      
    if (error) {
      console.error("Error loading FreeAgent credentials:", error);
      return null;
    }
    
    if (data) {
      const credentials = data as FreeAgentCredentialsTable;
      this.credentials = {
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret,
        accessToken: credentials.access_token || undefined,
        refreshToken: credentials.refresh_token || undefined,
        tokenExpiry: credentials.token_expiry || undefined
      };
      return this.credentials;
    }
    
    return null;
  },
  
  // Save credentials to localStorage
  async saveCredentials(credentials: FreeAgentCredentials): Promise<void> {
    this.credentials = credentials;
    
    const { error } = await supabase
      .from('freeagent_credentials')
      .upsert({
        id: 1, // Single record
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        token_expiry: credentials.tokenExpiry
      });
      
    if (error) {
      console.error("Error saving FreeAgent credentials:", error);
      toast.error("Failed to save FreeAgent credentials");
    }
  },
  
  // Generate the OAuth authorization URL
  getAuthUrl(clientId: string): string {
    // Trim whitespace from client ID to prevent redirect issues
    const trimmedClientId = clientId.trim();
    const redirectUri = getRedirectUri();
    
    const params = new URLSearchParams({
      client_id: trimmedClientId,
      response_type: 'code',
      redirect_uri: redirectUri
    });
    
    console.log("Generated FreeAgent Auth URL:", `${FREEAGENT_AUTH_URL}?${params.toString()}`);
    console.log("Using redirect URI:", redirectUri);
    console.log("Using client ID:", trimmedClientId);
    return `${FREEAGENT_AUTH_URL}?${params.toString()}`;
  },
  
  // Exchange the authorization code for access token
  async exchangeCodeForToken(code: string, clientId: string, clientSecret: string): Promise<boolean> {
    try {
      const trimmedClientId = clientId.trim();
      const trimmedClientSecret = clientSecret.trim();
      const redirectUri = getRedirectUri();
      
      console.log("Exchanging code for token with:", { 
        code, 
        clientId: trimmedClientId, 
        clientSecret: '***', 
        redirectUri 
      });
      
      const params = new URLSearchParams({
        client_id: trimmedClientId,
        client_secret: trimmedClientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      });
      
      const response = await fetch(FREEAGENT_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });
      
      console.log("Token exchange response status:", response.status);
      const data = await response.json();
      console.log("Token exchange response data:", data);
      
      if (!response.ok) {
        throw new Error(data.error_description || 'Failed to exchange code for token');
      }
      
      // Save the tokens
      await this.saveCredentials({
        clientId: trimmedClientId,
        clientSecret: trimmedClientSecret,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: Date.now() + (data.expires_in * 1000)
      });
      
      return true;
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      throw error;
    }
  },
  
  // Refresh the access token using the refresh token
  async refreshAccessToken(): Promise<boolean> {
    if (!this.credentials?.refreshToken) {
      return false;
    }
    
    try {
      const params = new URLSearchParams({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken
      });
      
      const response = await fetch(FREEAGENT_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error_description || 'Failed to refresh token');
      }
      
      // Update the tokens
      await this.saveCredentials({
        ...this.credentials,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.credentials.refreshToken,
        tokenExpiry: Date.now() + (data.expires_in * 1000)
      });
      
      return true;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      return false;
    }
  },
  
  // Ensure we have a valid access token
  async ensureValidToken(): Promise<boolean> {
    if (!this.credentials) {
      await this.loadCredentials();
      if (!this.credentials) {
        return false;
      }
    }
    
    // Check if token is expired or about to expire (within 5 minutes)
    const isExpired = this.credentials.tokenExpiry && 
                     (this.credentials.tokenExpiry - Date.now() < 5 * 60 * 1000);
    
    if (isExpired || !this.credentials.accessToken) {
      return await this.refreshAccessToken();
    }
    
    return true;
  },
  
  // Make authenticated request to FreeAgent API
  async apiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const hasValidToken = await this.ensureValidToken();
    
    if (!hasValidToken || !this.credentials?.accessToken) {
      throw new Error("No valid access token available");
    }
    
    const url = `${FREEAGENT_API_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || `API request failed: ${response.status}`);
    }
    
    return data;
  },
  
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const data = await this.apiRequest('/contacts');
      
      // Convert FreeAgent contacts to our Supplier format
      return data.contacts.map((contact: any) => ({
        id: contact.url,
        name: contact.organisation_name || contact.first_name + ' ' + contact.last_name,
        email: contact.email
      }));
    } catch (error) {
      console.error("Error fetching suppliers from FreeAgent:", error);
      // For demo purposes, return mock data if API fails
      return [
        { id: "sup_1", name: "ABC Supplier Ltd", email: "accounts@abcsupplier.com" },
        { id: "sup_2", name: "XYZ Corporation", email: "billing@xyzcorp.com" },
        { id: "sup_3", name: "Global Imports", email: "finance@globalimports.com" },
      ];
    }
  },
  
  async createBill(purchaseOrder: PurchaseOrder): Promise<Bill> {
    try {
      // Create bill in FreeAgent
      console.log("Creating bill in FreeAgent for PO:", purchaseOrder);
      
      // In a real implementation, this would make an API request
      // For now, simulate API call
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
  },
  
  // Disconnect from FreeAgent
  async disconnect(): Promise<void> {
    if (!this.credentials) {
      return;
    }
    
    // Delete the credentials from the database
    const { error } = await supabase
      .from('freeagent_credentials')
      .delete()
      .eq('id', 1);
      
    if (error) {
      console.error("Error deleting FreeAgent credentials:", error);
      toast.error("Failed to disconnect from FreeAgent");
      return;
    }
    
    this.credentials = null;
    toast.success("Disconnected from FreeAgent");
  }
};
