import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getFreeAgentClient, FreeAgentClient } from '../_shared/freeagent.ts';

// Types for the expected payload from the frontend
interface CreateProjectPayload {
  name: string;
  contact_url: string; // FreeAgent Contact URL for the customer
  initial_invoicing_amount: number;
  currency: string; // e.g., GBP
  companyId: string;
  userId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: CreateProjectPayload = await req.json();
    console.log("Create Project Function: Received payload:", payload);

    // Basic payload validation
    if (!payload.name || !payload.contact_url || payload.initial_invoicing_amount <= 0 || !payload.currency || !payload.companyId || !payload.userId) {
        throw new Error("Missing or invalid fields in create project payload.");
    }

    // 1. Create Supabase Admin Client
    const supabaseAdmin: SupabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Verify User Authentication (Placeholder - relies on service role)
    const userId = payload.userId;
    const companyId = payload.companyId;
    console.log(`Create Project Function: Invoked by user: ${userId} for company: ${companyId}`);

    // 3. Get FreeAgent Client
    const faClient = await getFreeAgentClient(supabaseAdmin, companyId);
    if (!faClient) {
        throw new Error("Failed to initialize FreeAgent client. Check connection.");
    }
    console.log("Create Project Function: FreeAgent client initialized.");

    // 4. Call FreeAgent API to Create Project
    const projectPayload = {
        project: {
            name: payload.name,
            contact: payload.contact_url,
            currency: payload.currency,
            status: 'Active',
            budget_units: "Hours", // Set budget_units to the string "Hours"
            // Add other relevant fields if needed from FA API docs
        }
    };
    console.log("Creating FreeAgent Project with payload:", JSON.stringify(projectPayload, null, 2));
    const faProjectResponse = await faClient.post('/projects', projectPayload);
    if (!faProjectResponse.ok) {
        const errorBody = await faProjectResponse.text();
        console.error(`FreeAgent project creation failed (${faProjectResponse.status}): ${errorBody}`);
        throw new Error(`Failed to create FreeAgent project: Status ${faProjectResponse.status}. ${errorBody}`);
    }
    const faProjectData = await faProjectResponse.json();
    const freeagentProjectUrl = faProjectData?.project?.url;
    if (!freeagentProjectUrl) throw new Error('Failed to create project or invalid response structure from FreeAgent.');
    console.log(`FreeAgent Project created: ${freeagentProjectUrl}`);

    // 6. Save Project Details to Supabase cached_projects table
    const projectRecord = {
        company_id: companyId,
        freeagent_url: freeagentProjectUrl,
        name: payload.name,
        status: faProjectData?.project?.status || 'Active', // Use status from FA response
        freeagent_contact_url: payload.contact_url,
        initial_invoicing_amount: payload.initial_invoicing_amount,
        freeagent_draft_invoice_url: null, // Set draft invoice URL to null
        currency: payload.currency, // Keep currency field
        raw_data: faProjectData?.project, // Store raw FA data
        synced_at: new Date().toISOString(),
    };

    const { data: insertedProject, error: insertError } = await supabaseAdmin
        .from('cached_projects')
        .insert(projectRecord)
        .select()
        .single();

    if (insertError) {
         // If insert fails, maybe attempt to delete the FA project/invoice?
         // For now, just log and throw
         console.error("Database Error saving project:", insertError.message);
         throw new Error(`Database Error saving project: ${insertError.message}`);
    }
    console.log('Project details saved to DB:', insertedProject.id);

    // 7. Return Success Response
    return new Response(JSON.stringify({
        success: true,
        message: 'Project created successfully in app and FreeAgent (Draft Invoice not created).',
        project: insertedProject // Return the saved project data
       }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- Error in create-project Edge Function ---', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    let status = 500;
    if (message.includes("authentication") || message.includes("Missing or invalid authorization")) status = 401;
    else if (message.includes("credentials") || message.includes("FreeAgent client")) status = 503;
    else if (message.includes("payload")) status = 400;
    else if (message.includes("Database Error")) status = 500;
    else if (message.includes("FreeAgent")) status = 502; // Bad Gateway for FA API errors
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
}); 