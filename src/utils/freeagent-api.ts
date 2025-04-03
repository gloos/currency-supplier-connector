// src/utils/freeagent-api.ts
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client"; // Use client instance
import { Supplier, Contact } from "@/types/freeagent";

// --- Constants ---
const FREEAGENT_AUTH_URL = "https://api.sandbox.freeagent.com/v2/approve_app";

// --- Dynamically get the redirect URI for the auth URL ---
const getRedirectUri = () => {
  const redirectUri = `${window.location.origin}/settings`;
  return redirectUri;
};

// --- Custom Error Class (Optional Client-Side) ---
export class FreeAgentClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FreeAgentClientError';
  }
}

// --- Refactored API Object ---
export const freeAgentApi = {

  /**
   * Loads minimal credential info (Client ID and connection status) from Supabase.
   * Returns null if not configured or error occurs.
   */
  async loadCredentials(): Promise<{ clientId: string; isConnected: boolean } | null> {
    // console.log("[Client API] Checking FreeAgent connection status..."); // Reduce noise
    try {
      const { data, error } = await supabase
        .from('freeagent_credentials')
        .select('client_id, access_token') // Only fetch non-sensitive info
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error("[Client API] Error loading credentials status:", error);
        return null;
      }
      if (!data) {
        // console.log("[Client API] No FreeAgent credentials record found."); // Reduce noise
        return null;
      }
      const result = {
        clientId: data.client_id || "",
        isConnected: !!data.access_token, // Connection based on token presence
      };
      // console.log("[Client API] FreeAgent connection status:", result); // Reduce noise
      return result;
    } catch (error) {
      console.error("[Client API] Exception loading credentials status:", error);
      return null;
    }
  },

  /**
   * Generates the FreeAgent OAuth authorization URL. Requires Client ID.
   */
  getAuthUrl(clientId: string): string {
    const trimmedClientId = clientId.trim();
    if (!trimmedClientId) {
        throw new FreeAgentClientError("Client ID is required to generate the authorization URL.");
    }
    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
      client_id: trimmedClientId,
      response_type: 'code',
      redirect_uri: redirectUri,
    });
    const authUrl = `${FREEAGENT_AUTH_URL}?${params.toString()}`;
    console.log("[Client API] Generated FreeAgent Auth URL:", authUrl);
    return authUrl;
  },

  /**
   * Fetches contacts from FreeAgent by invoking the secure Edge Function.
   */
  async getContacts(): Promise<Contact[]> {
    console.log("[Client API] Requesting contacts via Edge Function...");
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'get-freeagent-contacts' // Invoke the function by name
      );

      if (functionError) {
        console.error('[Client API] Edge Function invocation error (getContacts):', functionError);
        throw new Error(functionError.message || 'Failed to invoke backend function for contacts.');
      }
      if (functionData?.error) {
         console.error('[Client API] Edge Function execution error (getContacts):', functionData.error);
         throw new Error(functionData.error);
      }
      if (!Array.isArray(functionData?.contacts)) {
        console.warn('[Client API] No contacts array in Edge Function response', functionData);
        return []; // Return empty array if contacts are missing
      }

      console.log(`[Client API] Received ${functionData.contacts.length} contacts.`);
      return functionData.contacts as Contact[];

    } catch (error) {
      console.error("[Client API] Error fetching contacts:", error);
      toast.error("Failed to fetch contacts", {
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      });
      throw new FreeAgentClientError(error instanceof Error ? error.message : "Failed to fetch contacts.");
    }
  },

  /**
   * Converts a FreeAgent Contact object to the Supplier format.
   */
  contactToSupplier(contact: Contact): Supplier {
    return {
      id: contact.url,
      name: contact.organisation_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || "Unnamed Contact",
      email: contact.email || contact.billing_email || ''
    };
  },

  /**
   * Gets suppliers by fetching contacts via the secure Edge Function and formatting.
   */
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const contacts = await this.getContacts(); // Calls secure version
      return contacts.map(contact => this.contactToSupplier(contact));
    } catch (error) {
      // Error already handled/toasted in getContacts
      console.error("[Client API] Error formatting suppliers:", error);
      // Re-throw specific client error
      throw new FreeAgentClientError("Failed to process supplier list.");
    }
  },

  /**
   * Disconnects from FreeAgent by deleting credentials stored in Supabase.
   * Assumes RLS allows the deletion for the authenticated user.
   */
  async disconnect(): Promise<void> {
    console.log("[Client API] Attempting to disconnect FreeAgent...");
    try {
      const { error } = await supabase
        .from('freeagent_credentials')
        .delete()
        .eq('id', 1); // Target the specific row

      if (error) {
        console.error("[Client API] Supabase delete error:", error);
        throw new FreeAgentClientError(`Failed to delete credentials: ${error.message}`);
      }
      console.log("[Client API] Disconnect successful (DB record deleted).");
      // UI should update based on subsequent loadCredentials calls
    } catch (error) {
      console.error("[Client API] Error during disconnect:", error);
       toast.error("Failed to disconnect", {
           description: error instanceof Error ? error.message : "An unexpected error occurred."
       });
      // Re-throw specific client error
      throw new FreeAgentClientError(error instanceof Error ? error.message : "Failed to disconnect.");
    }
  }
};