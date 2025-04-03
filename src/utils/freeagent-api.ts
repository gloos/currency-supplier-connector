// src/utils/freeagent-api.ts
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client"; // Use client instance
import { Supplier, Contact } from "@/types/freeagent";

// --- Constants ---
const FREEAGENT_AUTH_URL = "https://api.sandbox.freeagent.com/v2/approve_app"; // Use Sandbox or Production

// --- Dynamically get the redirect URI for the auth URL ---
const getRedirectUri = () => {
  // Ensure this generates the correct URL where your Settings page is hosted
  const redirectUri = `${window.location.origin}/settings`;
  return redirectUri;
};

// --- Custom Error Class ---
// Keep if needed for disconnect error handling, otherwise potentially remove
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

// --- Refactored API Object ---
export const freeAgentApi = {

  /**
   * Generates the FreeAgent OAuth authorization URL.
   * Requires the Client ID from environment variables.
   */
  getAuthUrl(): string {
    const clientId = import.meta.env.VITE_FREEAGENT_CLIENT_ID;
    if (!clientId) {
        console.error("VITE_FREEAGENT_CLIENT_ID is not set in environment variables.");
        throw new Error("FreeAgent Client ID is missing. Cannot initiate connection.");
    }
    const trimmedClientId = clientId.trim();
    const redirectUri = getRedirectUri();

    const params = new URLSearchParams({
      client_id: trimmedClientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      // Request necessary scopes. 'full' is broad, refine based on minimum needs.
      scope: 'full',
    });

    const authUrl = `${FREEAGENT_AUTH_URL}?${params.toString()}`;
    console.log("Generated FreeAgent Auth URL:", authUrl);
    return authUrl;
  },

  /**
   * Disconnects from FreeAgent by deleting the credentials stored in Supabase.
   * Requires the specific ID of the credential row to delete.
   *
   * WARNING: Consider moving this to a secure 'disconnect-freeagent' Edge Function
   *          that verifies ownership server-side before deleting.
   *          Direct client-side deletion relies heavily on strict RLS policies.
   */
  async disconnect(credentialRowId: number): Promise<void> {
    console.log(`Attempting to disconnect FreeAgent (deleting credential row ID: ${credentialRowId})...`);
    try {
      // Delete the specific credential row for the user/company
      const { error } = await supabase
        .from('freeagent_credentials')
        .delete()
        .eq('id', credentialRowId); // Target the specific row ID

      if (error) {
        console.error("Supabase delete error:", error);
        // Check for RLS violation specifically if possible (e.g., error code/message)
        if (error.code === '42501') { // Standard PostgreSQL permission denied code
             throw new FreeAgentError("Permission denied. You might not be allowed to disconnect.", 403, error);
        }
        throw new FreeAgentError(`Failed to delete FreeAgent credentials: ${error.message}`, 500, error);
      }

      console.log("Successfully deleted FreeAgent credentials from database.");

    } catch (error) {
      console.error("Error during FreeAgent disconnect:", error);
      // Re-throw specific or generic error
      if (error instanceof FreeAgentError) {
          throw error;
      } else if (error instanceof Error){
          throw new FreeAgentError(`Failed to disconnect from FreeAgent: ${error.message}`);
      } else {
           throw new FreeAgentError("An unknown error occurred during disconnect.");
      }
    }
  }

  // REMOVED: loadCredentials, getContacts, contactToSupplier, getSuppliers
  // REMOVED: Old internal methods like init, saveCredentials, exchangeCodeForToken, etc.
};