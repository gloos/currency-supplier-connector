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

interface Contact {
  url: string;
  contact_name_on_invoices: boolean;
  created_at: string;
  updated_at: string;
  organisation_name: string;
  first_name: string;
  last_name: string;
  email: string;
  billing_email: string;
  phone_number: string;
  mobile: string;
  website: string;
  currency: string;
  status: string;
  uses_contact_invoice_sequence: boolean;
}

interface PurchaseOrder {
  id: string;
  supplierRef: string;
  reference: string;
  currencyCode: string;
  issueDate: string;
  items: PurchaseOrderItem[];
  total: number;
  notes?: string;
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
// Using sandbox URLs for testing
const FREEAGENT_AUTH_URL = "https://api.sandbox.freeagent.com/v2/approve_app";
const FREEAGENT_API_URL = "https://api.sandbox.freeagent.com/v2";
const FREEAGENT_TOKEN_URL = "https://api.sandbox.freeagent.com/v2/token_endpoint";

// Dynamically get the redirect URI based on the current origin
const getRedirectUri = () => {
  // Make sure this returns the exact URL we've configured in FreeAgent
  const redirectUri = `${window.location.origin}/settings`;
  console.log("Generated redirect URI:", redirectUri);
  return redirectUri;
};

// This is a placeholder implementation with OAuth2 flow for FreeAgent
export const freeAgentApi = {
  credentials: null as FreeAgentCredentials | null,
  
  async loadCredentials(): Promise<FreeAgentCredentials | null> {
    try {
      const { data, error } = await supabase
        .from('freeagent_credentials')
        .select('*')
        .single();
        
      if (error) {
        console.error("Error loading FreeAgent credentials:", error);
        return null;
      }
      
      if (!data) {
        console.log("No FreeAgent credentials found in database");
        return null;
      }
      
      const credentials: FreeAgentCredentials = {
        clientId: data.client_id,
        clientSecret: data.client_secret,
        accessToken: data.access_token || undefined,
        refreshToken: data.refresh_token || undefined,
        tokenExpiry: data.token_expiry || undefined
      };
      
      // Initialize the API with the loaded credentials
      this.init(credentials);
      return credentials;
    } catch (error) {
      console.error("Error loading FreeAgent credentials:", error);
      return null;
    }
  },
  
  init(credentials: FreeAgentCredentials) {
    this.credentials = credentials;
    console.log("FreeAgent API initialized with credentials", credentials);
    return this;
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
    
    const authUrl = `${FREEAGENT_AUTH_URL}?${params.toString()}`;
    console.log("Generated FreeAgent Auth URL:", authUrl);
    console.log("Using redirect URI:", redirectUri);
    console.log("Using client ID:", trimmedClientId);
    return authUrl;
  },
  
  // Exchange the authorization code for access token
  async exchangeCodeForToken(code: string, clientId: string, clientSecret: string): Promise<boolean> {
    try {
      const trimmedClientId = clientId.trim();
      const trimmedClientSecret = clientSecret.trim();
      const redirectUri = getRedirectUri();
      
      console.log("Full OAuth Token Exchange Details:", { 
        code, 
        clientId: trimmedClientId, 
        redirectUri,
        authUrl: FREEAGENT_TOKEN_URL
      });
      
      const params = new URLSearchParams({
        client_id: trimmedClientId,
        client_secret: trimmedClientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      });
      
      console.log("Request Parameters:", Object.fromEntries(params));
      
      const response = await fetch(FREEAGENT_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });
      
      console.log("Token Exchange Response Status:", response.status);
      const data = await response.json();
      console.log("Token Exchange Response Data:", data);
      
      if (!response.ok) {
        const errorMessage = data.error_description || 
          `Token exchange failed with status ${response.status}`;
        
        toast.error("FreeAgent Authorization Failed", {
          description: errorMessage
        });
        
        console.error("OAuth Token Exchange Error:", {
          status: response.status,
          errorDescription: errorMessage,
          fullResponse: data
        });
        
        throw new Error(errorMessage);
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
      console.error("Complete OAuth Token Exchange Error:", error);
      
      toast.error("Authorization Error", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
      
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
    try {
      const hasValidToken = await this.ensureValidToken();
      
      if (!hasValidToken || !this.credentials?.accessToken) {
        console.error("No valid access token available. Current credentials:", this.credentials);
        throw new Error("No valid access token available. Please reconnect to FreeAgent.");
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
      
      console.log(`Making ${method} request to ${url}`);
      console.log("Using access token:", this.credentials.accessToken.substring(0, 10) + "...");
      
      const response = await fetch(url, options);
      
      // Log the response status and headers
      console.log(`Response status: ${response.status}`);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      // Try to parse the response as JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('Response is not JSON:', text);
        // Try to parse it anyway in case it's actually JSON but wrong content-type
        try {
          data = JSON.parse(text);
        } catch (e) {
          // Not JSON, use text as is
          data = { text };
        }
      }
      
      console.log(`Response data:`, data);
      
      if (!response.ok) {
        const errorMessage = data.error_description || `API request failed: ${response.status}`;
        console.error("API request error:", errorMessage, data);
        
        // If we get a 401, try to refresh the token and retry once
        if (response.status === 401) {
          console.log("Received 401, attempting to refresh token...");
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.log("Token refreshed successfully, retrying request...");
            return this.apiRequest(endpoint, method, body);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },
  
  // Get contacts from FreeAgent
  async getContacts(): Promise<Contact[]> {
    try {
      console.log('Fetching contacts from FreeAgent');
      const data = await this.apiRequest('/contacts');
      console.log('Contacts response:', data);
      
      if (!data.contacts) {
        console.warn('No contacts found in response', data);
        return [];
      }
      
      return data.contacts;
    } catch (error) {
      console.error("Error fetching contacts from FreeAgent:", error);
      toast.error("Failed to fetch contacts", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
      // Return empty array on error
      return [];
    }
  },
  
  // Convert Contact to Supplier format
  contactToSupplier(contact: Contact): Supplier {
    return {
      id: contact.url,
      name: contact.organisation_name || `${contact.first_name} ${contact.last_name}`.trim(),
      email: contact.email || contact.billing_email || ''
    };
  },
  
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const contacts = await this.getContacts();
      
      // Convert FreeAgent contacts to our Supplier format
      return contacts.map(contact => this.contactToSupplier(contact));
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
      // Ensure we have valid credentials
      if (!this.credentials?.accessToken) {
        const credentials = await this.loadCredentials();
        if (!credentials?.accessToken) {
          throw new Error("FreeAgent credentials not found. Please connect to FreeAgent in settings.");
        }
      }
      
      // Create bill in FreeAgent
      console.log("Creating bill in FreeAgent for PO:", purchaseOrder);
      
      // Extract contact URL from supplierRef if it's a complete URL
      const contactUrl = purchaseOrder.supplierRef;
      
      // Prepare the bill payload according to FreeAgent API
      const billPayload = {
        bill: {
          contact: contactUrl,
          dated_on: purchaseOrder.issueDate.split('T')[0],
          due_on: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          reference: purchaseOrder.reference,
          comments: purchaseOrder.notes || 'Purchase Order',
          currency: purchaseOrder.currencyCode,
          bill_items_attributes: purchaseOrder.items.map((item, index) => ({
            position: index + 1,
            item_type: 'Products',
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            category: 'https://api.sandbox.freeagent.com/v2/categories/1' // Default category for testing
          }))
        }
      };

      console.log("Sending bill payload to FreeAgent:", billPayload);

      // Make the API call to create the bill
      const response = await this.apiRequest('/bills', 'POST', billPayload);
      
      console.log("FreeAgent bill creation response:", response);
      
      if (!response.bill) {
        console.error("Invalid response from FreeAgent:", response);
        throw new Error('No bill data received from FreeAgent');
      }

      const bill: Bill = {
        reference: response.bill.reference,
        dated_on: response.bill.dated_on,
        due_on: response.bill.due_on,
        currency: response.bill.currency,
        supplier_id: response.bill.contact,
        total_value: response.bill.total_value,
        status: response.bill.status
      };
      
      toast.success("Bill created in FreeAgent", {
        description: `Reference: ${bill.reference} (${bill.currency})`
      });
      
      return bill;
    } catch (error) {
      console.error("Error creating bill in FreeAgent:", error);
      
      // Provide more detailed error message to the user
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to create bill in FreeAgent. Please check your connection and try again.";
      
      toast.error("Failed to create bill in FreeAgent", {
        description: errorMessage
      });
      
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