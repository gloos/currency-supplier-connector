/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />

// supabase/functions/_shared/freeagent.ts
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Constants ---
// Use environment variables for flexibility between sandbox/production
const RAW_BASE_URL = Deno.env.get("FREEAGENT_API_BASE_URL") || "https://api.sandbox.freeagent.com";
// Ensure no trailing slash and that /v2 is NOT included yet
const CLEAN_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '').replace(/\/v2$/, ''); 
// Define V2 URL separately and use this consistently
const FREEAGENT_BASE_URL_V2 = `${CLEAN_BASE_URL}/v2`;

const FREEAGENT_TOKEN_URL = `${FREEAGENT_BASE_URL_V2}/token_endpoint`; // Use explicit V2 base
const TOKEN_EXPIRY_BUFFER_SECONDS = 300; // Refresh token 5 minutes before actual expiry

// --- Interfaces ---
interface FreeAgentCredentials {
    id: number | string; // Assuming 'id' is the PK
    company_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string; // ISO string format from Supabase (timestamp with time zone)
}

// Interface for the simple client returned by the helper
export interface FreeAgentClient {
    get: (endpoint: string) => Promise<Response>;
    post: (endpoint: string, body: Record<string, unknown>) => Promise<Response>;
    // Add put, delete etc. if needed
}

// --- Helper Functions ---

/**
 * Refreshes the FreeAgent access token using the refresh token.
 * Updates the credentials in the Supabase database.
 * @param supabaseAdmin - Supabase admin client instance.
 * @param creds - The current credentials containing the refresh token.
 * @returns The new access token.
 * @throws If refresh fails or database update fails.
 */
async function refreshAccessToken(
    supabaseAdmin: SupabaseClient,
    creds: FreeAgentCredentials
): Promise<string> {
    console.log(`Refreshing token for company: ${creds.company_id}`);
    const clientId = Deno.env.get("FREEAGENT_CLIENT_ID");
    const clientSecret = Deno.env.get("FREEAGENT_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
        console.error("Missing FREEAGENT_CLIENT_ID or FREEAGENT_CLIENT_SECRET env variables for token refresh.");
        throw new Error("Server configuration error: Missing FreeAgent credentials.");
    }

    try {
        const response = await fetch(FREEAGENT_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: creds.refresh_token,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`FreeAgent token refresh failed (${response.status}): ${errorBody}`);
            throw new Error(`Failed to refresh FreeAgent token: ${response.status}`);
        }

        const newTokens = await response.json();
        const newAccessToken = newTokens.access_token;
        const newRefreshToken = newTokens.refresh_token; // FreeAgent might issue a new refresh token
        const expiresIn = newTokens.expires_in; // Typically 3600 seconds (1 hour)

        if (!newAccessToken || !expiresIn) {
             throw new Error("Invalid token response received from FreeAgent during refresh.");
        }

        // Calculate new expiry time (store as ISO string)
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Update Supabase with new tokens and expiry
        const { error: updateError } = await supabaseAdmin
            .from("freeagent_credentials")
            .update({
                access_token: newAccessToken,
                refresh_token: newRefreshToken || creds.refresh_token, // Use new refresh token if provided
                expires_at: newExpiresAt,
                updated_at: new Date().toISOString(), // Update updated_at timestamp
            })
            .eq("id", creds.id); // Update the specific credential row

        if (updateError) {
            console.error("Failed to update refreshed tokens in database:", updateError);
            // Potentially problematic state: token refreshed but not saved.
            throw new Error("Failed to save refreshed FreeAgent tokens.");
        }

        console.log(`Token refreshed successfully for company: ${creds.company_id}`);
        return newAccessToken;

    } catch (error) {
        console.error("Error during token refresh process:", error);
        // Re-throw the specific error or a generic one
        throw error instanceof Error ? error : new Error("An unexpected error occurred during token refresh.");
    }
}

// --- Main Exported Function ---

/**
 * Gets a FreeAgent API client instance with a valid access token.
 * Handles fetching credentials and refreshing the token if necessary.
 * @param supabaseAdmin - Supabase admin client instance.
 * @param companyId - The UUID of the company whose credentials are needed.
 * @returns A FreeAgentClient instance or null if credentials are not found.
 * @throws If token refresh fails or there's a server configuration issue.
 */
export async function getFreeAgentClient(
    supabaseAdmin: SupabaseClient,
    companyId: string
): Promise<FreeAgentClient | null> {

    if (!companyId) {
        console.error("getFreeAgentClient called without companyId.");
        return null; // Or throw? Depends on how it's called.
    }

    // 1. Fetch credentials from Supabase
    const { data: credsData, error: fetchError } = await supabaseAdmin
        .from("freeagent_credentials")
        .select("id, company_id, access_token, refresh_token, expires_at")
        .eq("company_id", companyId)
        .maybeSingle(); // Expect 0 or 1 credential row per company

    if (fetchError) {
        console.error(`Error fetching FreeAgent credentials for company ${companyId}:`, fetchError);
        throw new Error("Database error fetching credentials.");
    }

    if (!credsData) {
        console.warn(`No FreeAgent credentials found for company ${companyId}.`);
        return null; // No connection configured for this company
    }

    const creds = credsData as FreeAgentCredentials;

    // 2. Check token expiry
    let accessToken = creds.access_token;
    const expiresAt = new Date(creds.expires_at).getTime();
    const nowWithBuffer = Date.now() + TOKEN_EXPIRY_BUFFER_SECONDS * 1000;

    if (nowWithBuffer >= expiresAt) {
        console.log(`Token expired or nearing expiry for company ${companyId}. Attempting refresh...`);
        try {
            accessToken = await refreshAccessToken(supabaseAdmin, creds);
        } catch (refreshError) {
            console.error(`Token refresh failed for company ${companyId}:`, refreshError);
            // Depending on requirements, you might return null or re-throw
            // Returning null means the operation requiring the client will fail downstream
            // Re-throwing stops the execution immediately
            throw refreshError; // Re-throw by default to indicate failure clearly
            // return null;
        }
    } else {
         console.log(`Token is valid for company ${companyId}.`);
    }

    // 3. Return client instance with the valid token
    const client: FreeAgentClient = {
        get: async (endpoint: string): Promise<Response> => {
            // Ensure endpoint starts with /, remove potential leading /v2 from input endpoint
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.replace(/^\/v2/, '') : '/' + endpoint.replace(/^\/?v2/, '');
            const url = `${FREEAGENT_BASE_URL_V2}${cleanEndpoint}`; // Use explicit V2 base
            console.log(`FA Client GET: ${url}`); 
            return fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                    "User-Agent": "YourAppName/1.0", 
                },
            });
        },
        post: async (endpoint: string, body: Record<string, unknown>): Promise<Response> => {
             // Ensure endpoint starts with /, remove potential leading /v2 from input endpoint
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.replace(/^\/v2/, '') : '/' + endpoint.replace(/^\/?v2/, '');
            const url = `${FREEAGENT_BASE_URL_V2}${cleanEndpoint}`; // Use explicit V2 base
             console.log(`FA Client POST: ${url}`);
            return fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "User-Agent": "YourAppName/1.0",
                },
                body: JSON.stringify(body),
            });
        },
        // Add put, delete if needed
    };

    return client;
}