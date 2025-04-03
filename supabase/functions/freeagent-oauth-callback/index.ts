/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />

// supabase/functions/freeagent-oauth-callback/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // We'll create this shared file next

const FREEAGENT_TOKEN_URL = Deno.env.get("FREEAGENT_API_BASE_URL")?.replace(/\/v2$/, '') + '/v2/token_endpoint' || 'https://api.sandbox.freeagent.com/v2/token_endpoint';

async function getCompanyIdForUser(supabaseAdmin: SupabaseClient, userId: string): Promise<string> {
    const { data, error } = await supabaseAdmin
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .single(); // Expect exactly one company per user for this flow

    if (error || !data?.company_id) {
        console.error(`Error fetching company ID for user ${userId}:`, error);
        throw new Error('User is not associated with a company or database error occurred.');
    }
    return data.company_id;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    if (!code) {
      throw new Error('Authorization code is missing.');
    }

    // --- Get Supabase Admin Client ---
     const supabaseAdmin = createClient(
       Deno.env.get('SUPABASE_URL') ?? "",
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
     );

    // --- Verify User JWT and Get User/Company ID ---
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
         throw new Error("Missing authorization header");
     }
     const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
         authHeader.replace("Bearer ", "")
     );
     if (userError || !user) {
          console.error("Auth error:", userError);
          throw new Error("Authentication failed: Invalid token");
     }
     console.log("Callback initiated by user:", user.id);
     const companyId = await getCompanyIdForUser(supabaseAdmin, user.id);
     console.log("Target company ID:", companyId);

    // --- Get secrets securely from Edge Function environment variables ---
    const freeagentClientId = Deno.env.get('FREEAGENT_CLIENT_ID');
    const freeagentClientSecret = Deno.env.get('FREEAGENT_CLIENT_SECRET');
    const siteUrl = Deno.env.get('SITE_URL');

    if (!freeagentClientId || !freeagentClientSecret || !siteUrl) {
      console.error('Missing FreeAgent or SITE_URL credentials in environment variables.');
      throw new Error('Server configuration error.');
    }
    const redirectUri = `${siteUrl}/settings`;

    console.log('Callback function received code for company:', companyId);
    // console.log('Using Client ID:', freeagentClientId); // Avoid logging Client ID
    // console.log('Using Client Secret:', freeagentClientSecret ? '***' : 'Not Set'); // Avoid logging secrets
    console.log('Using Redirect URI:', redirectUri);

    // --- Exchange code for token ---
    const params = new URLSearchParams({
      client_id: freeagentClientId,
      client_secret: freeagentClientSecret,
      grant_type: 'authorization_code',
      code: code.toString(), // Ensure code is a string
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(FREEAGENT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    const tokenData = await tokenResponse.json();

    // console.log('FreeAgent Token Response Status:', tokenResponse.status);
    // console.log('FreeAgent Token Response Body:', tokenData); // Avoid logging tokens

    if (!tokenResponse.ok) {
      const errorDetail = tokenData.error_description || tokenData.error || `Token exchange failed with status ${tokenResponse.status}`;
      console.error('Token exchange failed:', errorDetail);
      throw new Error(`FreeAgent Error: ${errorDetail}`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token || !expires_in) {
       console.error('Token exchange response missing required fields.');
       throw new Error('Failed to retrieve complete tokens from FreeAgent.');
    }

    // --- Save tokens securely to Supabase ---
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const credentialsToSave = {
      company_id: companyId, // Associate with the correct company
      access_token: access_token, // Store securely (consider encryption via pgsodium later)
      refresh_token: refresh_token, // Store securely (consider encryption)
      expires_at: expiresAt, // Store ISO string
      updated_at: new Date().toISOString(),
      // Add client_id back to satisfy NOT NULL constraint
      client_id: freeagentClientId, 
      // DO NOT store client_secret here.
    };

    // Upsert based on company_id. Assumes one credential set per company.
    // If multiple credentials per company were possible, need a different strategy.
    const { error: upsertError } = await supabaseAdmin
      .from('freeagent_credentials')
      .upsert(credentialsToSave, { onConflict: 'company_id' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      // Provide more specific feedback if it's a constraint violation etc.
      throw new Error(`Database Error: ${upsertError.message}`);
    }

    console.log(`Successfully saved FreeAgent credentials for company ${companyId}.`);

    return new Response(JSON.stringify({ success: true, message: 'FreeAgent connected successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in freeagent-oauth-callback function:', error);
    // Determine appropriate status code based on error type
    let status = 500;
    if (error.message.includes('Authentication failed') || error.message.includes('User is not associated')) {
        status = 401; // Or 403
    }
     else if (error.message.includes('FreeAgent Error:') || error.message.includes('Authorization code is missing')) {
         status = 400;
     }
     else if (error.message.includes('Server configuration error')) {
         status = 503; // Service Unavailable
     }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});

// Create a shared CORS file: supabase/functions/_shared/cors.ts
// mkdir -p supabase/functions/_shared
// touch supabase/functions/_shared/cors.ts
/* Add the following to supabase/functions/_shared/cors.ts:
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specific origin: Deno.env.get('SITE_URL')
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Add methods as needed
};
*/