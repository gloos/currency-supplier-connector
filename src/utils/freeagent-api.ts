import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  FreeAgentCredentials,
  Supplier,
  Contact,
  PurchaseOrder,
  Bill,
  FreeAgentCredentialsTable,
  PreferencesTable
} from "@/types/freeagent";

// Updated OAuth URLs based on FreeAgent API documentation
// Using sandbox URLs for testing
const FREEAGENT_AUTH_URL = "https://api.sandbox.freeagent.com/v2/approve_app";
const FREEAGENT_API_URL = "https://api.sandbox.freeagent.com/v2";
const FREEAGENT_TOKEN_URL = "https://api.sandbox.freeagent.com/v2/token_endpoint";

// Dynamically get the redirect URI based on the current origin
const getRedirectUri = () => {
  const redirectUri = `${window.location.origin}/settings`;
  console.log("Generated redirect URI:", redirectUri);
  return redirectUri;
};

// Custom error class for FreeAgent API errors
export class FreeAgentError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'FreeAgentError';
  }
}

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
        throw new FreeAgentError("Failed to load FreeAgent credentials", 500, error);
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
      throw error instanceof FreeAgentError 
        ? error 
        : new FreeAgentError("Failed to load FreeAgent credentials");
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
    
    try {
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
        throw new FreeAgentError("Failed to save FreeAgent credentials", 500, error);
      }
    } catch (error) {
      console.error("Error saving FreeAgent credentials:", error);
      toast.error("Failed to save FreeAgent credentials");
      throw error instanceof FreeAgentError 
        ? error 
        : new FreeAgentError("Failed to save FreeAgent credentials");
    }
  },
  
  // Generate the OAuth authorization URL
  getAuthUrl(clientId: string): string {
    const trimmedClientId = clientId.trim();
    const redirectUri = getRedirectUri();
    
    const params = new URLSearchParams({
      client_id: trimmedClientId,
      response_type: 'code',
      redirect_uri: redirectUri
    });
    
    const authUrl = `${FREEAGENT_AUTH_URL}?${params.toString()}`;
    console.log("Generated FreeAgent Auth URL:", authUrl);
    return authUrl;
  },
  
  // Exchange the authorization code for access token
  async exchangeCodeForToken(code: string, clientId: string, clientSecret: string): Promise<boolean> {
    try {
      const trimmedClientId = clientId.trim();
      const trimmedClientSecret = clientSecret.trim();
      const redirectUri = getRedirectUri();
      
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
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error_description || 
          `Token exchange failed with status ${response.status}`;
        
        throw new FreeAgentError(errorMessage, response.status, data);
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
      throw error instanceof FreeAgentError 
        ? error 
        : new FreeAgentError("Failed to exchange code for token");
    }
  },
  
  // Refresh the access token using the refresh token
  async refreshAccessToken(): Promise<boolean> {
    if (!this.credentials?.refreshToken) {
      throw new FreeAgentError("No refresh token available");
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
        throw new FreeAgentError(
          data.error_description || 'Failed to refresh token',
          response.status,
          data
        );
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
      throw error instanceof FreeAgentError 
        ? error 
        : new FreeAgentError("Failed to refresh access token");
    }
  },
  
  // Ensure we have a valid access token
  async ensureValidToken(): Promise<boolean> {
    if (!this.credentials) {
      await this.loadCredentials();
      if (!this.credentials) {
        throw new FreeAgentError("No credentials available");
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
        throw new FreeAgentError("No valid access token available. Please reconnect to FreeAgent.");
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
      if (body) {
        console.log('Request body:', JSON.stringify(body, null, 2));
      }
      
      const response = await fetch(url, options);
      const data = await response.json();
      
      // Log the full response data regardless of status code
      console.log(`FreeAgent API Response (${response.status}):`, JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        const errorMessage = data.error_description || `API request failed: ${response.status}`;
        
        // If we get a 401, try to refresh the token and retry once
        if (response.status === 401) {
          console.log("Received 401, attempting to refresh token...");
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.log("Token refreshed successfully, retrying request...");
            return this.apiRequest(endpoint, method, body);
          }
        }
        
        throw new FreeAgentError(errorMessage, response.status, data);
      }
      
      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error instanceof FreeAgentError 
        ? error 
        : new FreeAgentError("API request failed");
    }
  },
  
  // Get contacts from FreeAgent
  async getContacts(): Promise<Contact[]> {
    try {
      console.log('Fetching contacts from FreeAgent');
      const data = await this.apiRequest('/contacts');
      
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
      throw error;
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
      return contacts.map(contact => this.contactToSupplier(contact));
    } catch (error) {
      console.error("Error fetching suppliers from FreeAgent:", error);
      throw error;
    }
  },
  
  async createBill(purchaseOrder: PurchaseOrder): Promise<Bill> {
    try {
      // Ensure we have valid credentials
      if (!this.credentials?.accessToken) {
        const credentials = await this.loadCredentials();
        if (!credentials?.accessToken) {
          throw new FreeAgentError("FreeAgent credentials not found. Please connect to FreeAgent in settings.");
        }
      }
      
      // Create bill in FreeAgent
      console.log("Creating bill in FreeAgent for PO:", purchaseOrder);
      
      // Extract contact URL from supplierRef if it's a complete URL
      const contactUrl = purchaseOrder.supplierRef;
      
      // Calculate total amount from line items
      const totalAmount = purchaseOrder.items.reduce((sum, item) => sum + item.total, 0);
      
      // Prepare the bill payload according to FreeAgent API
      const billPayload = {
        bill: {
          contact: contactUrl,
          dated_on: purchaseOrder.issueDate.split('T')[0],
          due_on: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          reference: purchaseOrder.reference, // This is the PO number
          comments: purchaseOrder.notes || 'Purchase Order',
          currency: purchaseOrder.currencyCode,
          bill_items_attributes: purchaseOrder.items.map((item, index) => {
            // Basic validation before creating the item payload
            if (typeof item.price !== 'number' || typeof item.quantity !== 'number') {
              console.error("Invalid item data:", item);
              throw new FreeAgentError(`Invalid data for item ${index + 1}: price or quantity is not a number.`);
            }

            return {
              category: 'https://api.sandbox.freeagent.com/v2/categories/150',
              description: item.description || 'Item', // Ensure description is not empty
              quantity: item.quantity.toString(),
              unit: 'unit',
              // Changed price to price_per_unit as per API docs
              price_per_unit: item.price.toString(),
              // Removed total_value as it's read-only and calculated by FreeAgent
              sales_tax_rate: "0.0",
              sales_tax_status: "TAXABLE"
            };
          })
        }
      };

      console.log("Sending bill payload to FreeAgent:", JSON.stringify(billPayload, null, 2));
      // Inside createBill, right before the apiRequest call:
      console.log("Final billPayload being sent:", JSON.stringify(billPayload, null, 2));
      const responseData = await this.apiRequest('/bills', 'POST', billPayload);
      // Make the API call to create the bill
      const response = await this.apiRequest('/bills', 'POST', billPayload);
      
      if (!response.bill) {
        throw new FreeAgentError('No bill data received from FreeAgent');
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
        description: `Reference: ${bill.reference} (${bill.currency}) - Total: ${bill.total_value}`
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
    
    try {
      const { error } = await supabase
        .from('freeagent_credentials')
        .delete()
        .eq('id', 1);
        
      if (error) {
        throw new FreeAgentError("Failed to delete FreeAgent credentials", 500, error);
      }
      
      this.credentials = null;
      toast.success("Disconnected from FreeAgent");
    } catch (error) {
      console.error("Error deleting FreeAgent credentials:", error);
      toast.error("Failed to disconnect from FreeAgent");
      throw error instanceof FreeAgentError 
        ? error 
        : new FreeAgentError("Failed to disconnect from FreeAgent");
    }
  }
};