// supabase/functions/freeagent-oauth-callback/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // We'll create this shared file next

const FREEAGENT_TOKEN_URL = 'https://api.sandbox.freeagent.com/v2/token_endpoint';

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

    // --- Get secrets securely from Edge Function environment variables ---
    const freeagentClientId = Deno.env.get('FREEAGENT_CLIENT_ID');
    const freeagentClientSecret = Deno.env.get('FREEAGENT_CLIENT_SECRET');
    const redirectUri = Deno.env.get('SITE_URL') + '/settings'; // Use SITE_URL set in Supabase env vars

    if (!freeagentClientId || !freeagentClientSecret) {
      console.error('Missing FreeAgent credentials in environment variables.');
      throw new Error('Server configuration error: Missing FreeAgent credentials.');
    }
     if (!Deno.env.get('SITE_URL')) {
       console.error('Missing SITE_URL in environment variables.');
       throw new Error('Server configuration error: Missing SITE_URL.');
     }

    console.log('Callback function received code:', code);
    console.log('Using Client ID:', freeagentClientId); // Be careful logging secrets, even partially
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

    console.log('FreeAgent Token Response Status:', tokenResponse.status);
    console.log('FreeAgent Token Response Body:', tokenData);


    if (!tokenResponse.ok) {
      const errorDetail = tokenData.error_description || tokenData.error || `Token exchange failed with status ${tokenResponse.status}`;
      console.error('Token exchange failed:', errorDetail);
      throw new Error(`FreeAgent Error: ${errorDetail}`);
    }

    if (!tokenData.access_token) {
       console.error('Token exchange succeeded but no access_token received.');
       throw new Error('Failed to retrieve access token from FreeAgent.');
    }

    // --- Save tokens securely to Supabase ---
    // Note: Use the Service Role Key for admin tasks like this.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use Service Role Key
    );

    const credentialsToSave = {
      id: 1, // Assuming a single row for credentials
      client_id: freeagentClientId,
      client_secret: freeagentClientSecret, // Store securely
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: Date.now() + (tokenData.expires_in * 1000),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      .from('freeagent_credentials')
      .upsert(credentialsToSave);

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      throw new Error(`Database Error: ${upsertError.message}`);
    }

    console.log('Successfully exchanged code and saved credentials.');

    return new Response(JSON.stringify({ success: true, message: 'FreeAgent connected successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in freeagent-oauth-callback function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message.includes('FreeAgent Error:') ? 400 : 500,
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