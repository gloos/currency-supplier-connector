// supabase/functions/get-freeagent-contacts/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// Import shared helpers
import { isTokenExpired, refreshFreeAgentToken, freeAgentApiRequest } from '../_shared/freeagent.ts';

console.log("Function 'get-freeagent-contacts' initializing.");

serve(async (req: Request) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Handling GET request for contacts");

    // 2. Create Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables.");
      throw new Error("Server configuration error.");
    }
    const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // 3. Verify User Authentication (using JWT from Authorization header)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error("Auth user error:", userError);
      return new Response(JSON.stringify({ error: `Authentication error: ${userError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    if (!user) {
       console.error("Auth error: User not found for token.");
       return new Response(JSON.stringify({ error: `Authentication error: User not found` }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 401,
       });
    }
    console.log('Request authenticated for user:', user.id, user.email);

    // 4. Retrieve FreeAgent Credentials Securely
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('freeagent_credentials')
      .select('access_token, refresh_token, token_expiry, client_id, client_secret')
      .eq('id', 1) // Assuming single credential row
      .single();

    if (credError) {
      console.error('Error fetching credentials from DB:', credError);
      throw new Error('Database error retrieving FreeAgent credentials.');
    }
    if (!credentials) {
      throw new Error('FreeAgent credentials not found. Please connect in settings.');
    }
    if (!credentials.client_id || !credentials.client_secret) {
      throw new Error('Incomplete FreeAgent credentials stored.');
    }

    let { access_token, refresh_token, token_expiry, client_id, client_secret } = credentials;

    // 5. Check Token Expiry and Refresh if Needed
    if (!access_token || isTokenExpired(token_expiry)) {
      console.log(`Token ${!access_token ? 'missing' : 'expired'}, attempting refresh...`);
      if (!refresh_token) {
        throw new Error('Cannot refresh FreeAgent token: missing refresh token. Please reconnect in settings.');
      }
      access_token = await refreshFreeAgentToken(refresh_token, client_id, client_secret, supabaseAdmin);
      if (!access_token) {
        throw new Error('Failed to refresh FreeAgent token. Please try reconnecting in settings.');
      }
      console.log("Token refresh successful for contacts request.");
    } else {
      console.log("Using existing valid FreeAgent token for contacts request.");
    }

    // 6. Call FreeAgent API to Get Contacts
    console.log("Calling FreeAgent /contacts endpoint...");
    const contactsResponse = await freeAgentApiRequest(
        '/contacts', // The endpoint for contacts
        'GET',     // Method is GET
        null,      // No body needed for GET
        access_token // Pass the valid token
    );

    // 7. Process and Return Response
    if (!contactsResponse || !Array.isArray(contactsResponse.contacts)) {
        console.warn('Invalid or missing contacts array in FreeAgent response:', contactsResponse);
        // Return empty array if contacts are missing but call was otherwise okay
        return new Response(JSON.stringify({ contacts: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    console.log(`Successfully fetched ${contactsResponse.contacts.length} contacts from FreeAgent.`);
    return new Response(JSON.stringify({ contacts: contactsResponse.contacts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- Error in get-freeagent-contacts Edge Function ---');
    console.error(error);
    // Determine status code based on error type if possible
    const status = (error as any).status || 500; // Use status from FreeAgentError or default 500
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});