// supabase/functions/create-purchase-order/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// *** Import shared helpers ***
import { isTokenExpired, refreshFreeAgentToken, freeAgentApiRequest } from '../_shared/freeagent.ts';

// *** Remove local definitions of these constants/helpers if they existed here ***
// const FREEAGENT_API_URL = ...
// const FREEAGENT_TOKEN_URL = ...
// async function refreshFreeAgentToken(...) { ... }
// async function freeAgentApiRequest(...) { ... }

// Constants specific to this function (if any)
const DEFAULT_FREEAGENT_CATEGORY_URL = 'https://api.sandbox.freeagent.com/v2/categories/250';

// Types (keep as before)
interface PurchaseOrderItemInput { /* ... */ }
interface CreatePurchaseOrderPayload { /* ... */ }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: CreatePurchaseOrderPayload = await req.json();
    console.log("Create PO Function: Received payload:", payload);

    // Basic payload validation...

    // 1. Create Supabase Admin Client (as before)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Server configuration error.");
    const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Verify User Authentication (as before)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Missing or invalid authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error(`Authentication error: ${userError?.message ?? 'User not found'}`);
    console.log('Create PO Function: Invoked by user:', user.id);

    // 3. Retrieve FreeAgent Credentials (as before)
     const { data: credentials, error: credError } = await supabaseAdmin
       .from('freeagent_credentials')
       .select('access_token, refresh_token, token_expiry, client_id, client_secret')
       .eq('id', 1)
       .single();
     if (credError || !credentials || !credentials.client_id || !credentials.client_secret) {
        // Handle missing/incomplete credentials error (as before)
        throw new Error('FreeAgent credentials configuration issue.');
     }
     let { access_token, refresh_token, token_expiry, client_id, client_secret } = credentials;


    // 4. Check Token Expiry and Refresh if Needed (using shared helper)
    if (!access_token || isTokenExpired(token_expiry)) { // Use shared helper
      console.log('Create PO Function: Token expired or missing, attempting refresh...');
      if (!refresh_token) throw new Error('Cannot refresh: missing refresh token.');
      access_token = await refreshFreeAgentToken(refresh_token, client_id, client_secret, supabaseAdmin); // Use shared helper
      if (!access_token) throw new Error('Failed to refresh FreeAgent token.');
      console.log("Create PO Function: Token refresh successful.");
    } else {
        console.log("Create PO Function: Using existing valid token.");
    }


    // 5. Construct FreeAgent Bill Payload (as before)
    const billPayload = { /* ... construct payload ... */
        bill: {
            contact: payload.supplierRef,
            dated_on: new Date().toISOString().split('T')[0],
            reference: payload.reference,
            comments: payload.notes || `From Purchase Order ${payload.reference}`,
            currency: payload.currencyCode,
            bill_items: payload.items.map((item: PurchaseOrderItemInput) => ({
              description: item.description,
              quantity: item.quantity.toString(),
              price_per_unit: item.price.toFixed(2).toString(),
              category: DEFAULT_FREEAGENT_CATEGORY_URL,
              sales_tax_rate: '0.0',
            })),
          },
    };

    // 6. Call FreeAgent API to Create Bill (using shared helper)
    const freeagentBillResponse = await freeAgentApiRequest( // Use shared helper
        '/bills',
        'POST',
        billPayload,
        access_token
    );
    if (!freeagentBillResponse?.bill?.url) throw new Error('Failed to create bill or invalid response.');
    const freeagentBillUrl = freeagentBillResponse.bill.url;
    const freeagentBillId = freeagentBillUrl.split('/').pop();
    console.log('Create PO Function: FreeAgent Bill created:', freeagentBillUrl);

    // 7. Save Purchase Order to Supabase (as before)
    const poTotalAmount = payload.items.reduce(/*...*/);
    const poRecord = { /* ... construct record ... */
        po_number: payload.reference,
        freeagent_bill_id: freeagentBillId,
        freeagent_contact_id: payload.supplierRef, // Add this column to your table
        currency: payload.currencyCode,
        notes: payload.notes, // Ensure this column exists (or map to description)
        created_by: user.id,
        total_amount: poTotalAmount, // Ensure this column exists (or map to amount)
        status: 'Sent',
        company_id: payload.companyId,
        // Add other fields like project_id, delivery_date if needed
    };
    const { data: insertedPO, error: insertError } = await supabaseAdmin
      .from('purchase_orders')
      .insert(poRecord)
      .select()
      .single();
    if (insertError) throw new Error(`Database Error: ${insertError.message}`);
    console.log('Create PO Function: PO saved to DB:', insertedPO.id);

    // 8. Save Line Items (as before, ensure company_id exists in po_lines)
     if (insertedPO && insertedPO.id && payload.items.length > 0) {
         const lineItemsToInsert = payload.items.map(item => ({
             po_id: insertedPO.id,
             description: item.description,
             quantity: item.quantity,
             unit_price: item.price,
             vat_rate: 0.0, // Add column if needed
             line_total: item.quantity * item.price, // Add column if needed
             company_id: payload.companyId, // Ensure this column exists
         }));
         const { error: linesError } = await supabaseAdmin
             .from('po_lines')
             .insert(lineItemsToInsert);
         if (linesError) throw new Error(`Database Error saving lines: ${linesError.message}`);
         console.log("Create PO Function: PO Lines saved.");
     }

    // 9. Return Success Response (as before)
    return new Response(JSON.stringify({
        success: true,
        message: 'Purchase Order and FreeAgent Bill created successfully.',
        purchaseOrderId: insertedPO.id,
        freeagentBillUrl: freeagentBillUrl,
       }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Error handling (as before)
    console.error('--- Error in create-purchase-order Edge Function ---');
    console.error(error);
    const status = (error as any).status || 500;
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});