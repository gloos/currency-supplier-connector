import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Define the expected request body type
interface UpdatePOStatusPayload {
  token: string; // The supplier_portal_token
  action: 'accept' | 'reject';
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseAdmin: SupabaseClient | null = null;

  try {
    const { token, action }: UpdatePOStatusPayload = await req.json();
    console.log("Update PO Status Function: Received token:", token, "Action:", action);

    if (!token || !action || (action !== 'accept' && action !== 'reject')) {
      throw new Error("Missing or invalid required fields: token, action ('accept' or 'reject')");
    }

    // 1. Create Supabase Admin Client
    supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Find PO by token and check status
    const { data: poData, error: fetchError } = await supabaseAdmin
        .from('purchase_orders')
        .select('id, po_number, status')
        .eq('supplier_portal_token', token)
        .single();

    if (fetchError) {
        console.error("Database error fetching PO by token:", fetchError);
        // Distinguish between not found and other errors if possible
        if (fetchError.code === 'PGRST116') { // PostgREST code for "exactly one row was required, but 0 or more were found"
             throw new Error("Invalid or expired token. Purchase order not found.");
        }
        throw new Error(`Database Error fetching PO: ${fetchError.message}`);
    }

    if (!poData) { // Should be caught by PGRST116 but double-check
        throw new Error("Invalid or expired token. Purchase order not found.");
    }

    // 3. Validate current status
    if (poData.status !== 'SentToSupplier') {
        console.warn(`PO ${poData.id} status is already ${poData.status}. Cannot ${action}.`);
        throw new Error(`This purchase order has already been processed (Status: ${poData.status}). No further action needed.`);
    }

    // 4. Determine new status
    const newStatus = action === 'accept' ? 'AcceptedBySupplier' : 'RejectedBySupplier';

    // 5. Update PO Status in Supabase
    const { error: updateError } = await supabaseAdmin
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', poData.id);

    if (updateError) {
        console.error(`Database error updating PO ${poData.id} status to ${newStatus}:`, updateError);
        throw new Error(`Database error updating PO status: ${updateError.message}`);
    }
    
    console.log(`PO ${poData.id} status updated to ${newStatus}.`);
    
    // TODO: Optionally trigger notification back to the app user (e.g., via another function or webhook)

    // 6. Return Success Response
    const successMessage = `Purchase Order ${poData.po_number} has been successfully ${action === 'accept' ? 'accepted' : 'rejected'}.`;
    return new Response(JSON.stringify({
        success: true,
        message: successMessage,
        newStatus: newStatus
       }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- Error in update-po-status-by-token Edge Function ---', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    let status = 500;
    // Set appropriate HTTP status codes
    if (message.includes("Missing or invalid")) status = 400;
    if (message.includes("not found")) status = 404;
    if (message.includes("already been processed")) status = 409; // Conflict
    if (message.includes("Database Error")) status = 500;
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
}); 