// supabase/functions/create-purchase-order/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// *** Import ONLY the client helper ***
import { getFreeAgentClient, FreeAgentClient } from '../_shared/freeagent.ts';

// Constants specific to this function
const DEFAULT_FREEAGENT_CATEGORY_URL = 'https://api.sandbox.freeagent.com/v2/categories/250';

// Types (ensure these match the payload received from the frontend)
interface PurchaseOrderItemInput {
  description: string;
  quantity: number;
  unit_price: number; // Renamed from price for clarity
  category_url?: string | null; // Expecting FA URL
}

interface CreatePurchaseOrderPayload {
  po_number: string;
  supplier_url: string; // Expecting FA Contact URL
  issue_date: string; // ISO Date string
  delivery_date?: string | null; // ISO Date string
  currency: string; // e.g., GBP
  project_url?: string | null; // Expecting FA Project URL
  notes?: string | null;
  line_items: PurchaseOrderItemInput[];
  companyId: string; // Passed from frontend/auth context
  userId: string;    // Passed from frontend/auth context
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: CreatePurchaseOrderPayload = await req.json();
    console.log("Create PO Function: Received payload:", payload);

    // Basic payload validation
    if (!payload.po_number || !payload.supplier_url || !payload.issue_date || !payload.currency || !payload.line_items || payload.line_items.length === 0 || !payload.companyId || !payload.userId) {
        throw new Error("Missing required fields in purchase order payload.");
    }

    // 1. Create Supabase Admin Client 
    const supabaseAdmin: SupabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Verify User Authentication (Simplified as we use service role, but good practice)
    // Note: Using --no-verify-jwt bypasses this check during local dev/deploy
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        console.warn("Missing/invalid auth header, proceeding due to service role key usage.");
    }
    // In production, you might re-verify the token against Supabase Auth here if needed
    // For now, we trust the userId passed in the payload assuming frontend verified it.
    const userId = payload.userId;
    const companyId = payload.companyId;
    console.log(`Create PO Function: Invoked by user: ${userId} for company: ${companyId}`);

    // 3. Get FreeAgent Client (handles creds & refresh internally)
    // const faClient = await getFreeAgentClient(supabaseAdmin, companyId);
    // if (!faClient) {
    //     throw new Error("Failed to initialize FreeAgent client. Check connection in settings or server logs.");
    // }
    // console.log("Create PO Function: FreeAgent client initialized successfully.");

    // 4. Construct FreeAgent Bill Payload (Map from our payload) - REMOVED
    // const billPayload = { ... };
    // console.log("Create PO Function: Sending payload to FreeAgent:", JSON.stringify(billPayload, null, 2));

    // 5. Call FreeAgent API to Create Bill (using the client) - REMOVED
    // const freeagentResponse = await faClient.post('/bills', billPayload);
    // if (!freeagentResponse.ok) { ... }
    // const freeagentBillResponseData = await freeagentResponse.json();
    // const freeagentBillUrl = freeagentBillResponseData?.bill?.url;
    // if (!freeagentBillUrl) throw new Error('Failed to create bill or invalid response structure from FreeAgent.');
    
    // const freeagentBillIdMatch = freeagentBillUrl.match(/\/(\d+)$/); // Extract ID from URL
    // const freeagentBillId = freeagentBillIdMatch ? parseInt(freeagentBillIdMatch[1], 10) : null;
    // console.log(`Create PO Function: FreeAgent Bill created: ${freeagentBillUrl} (ID: ${freeagentBillId})`);

    // 6. Fetch Supplier Name and Email from cache using URL
    let supplierName = 'Unknown Supplier'; // Default fallback
    let supplierEmail: string | null = null; // Variable to store email
    if (payload.supplier_url) {
        const { data: contactData, error: contactError } = await supabaseAdmin
            .from('cached_contacts')
            .select('name, email') // Select email as well
            .eq('freeagent_url', payload.supplier_url)
            .eq('company_id', companyId) // Ensure it belongs to the right company
            .maybeSingle();
            
        if (contactError) {
            console.error(`Error fetching supplier details for URL ${payload.supplier_url}:`, contactError.message);
            // Non-fatal error, proceed with defaults
        } else if (contactData) {
            supplierName = contactData.name ?? supplierName;
            supplierEmail = contactData.email ?? null; // Store the fetched email
            console.log(`Found supplier: ${supplierName}, Email: ${supplierEmail}`);
        } else {
             console.warn(`Could not find supplier details in cache for URL: ${payload.supplier_url}`);
        }
    }

    // 7. Generate Unique Token for Supplier Portal
    const supplierPortalToken = crypto.randomUUID();

    // 8. Save Purchase Order to Supabase (Renumbered)
    const poTotalAmount = payload.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const poRecord = {
        po_number: payload.po_number,
        freeagent_contact_url: payload.supplier_url,
        freeagent_project_url: payload.project_url,
        supplier_name: supplierName,
        supplier_email: supplierEmail,
        supplier_portal_token: supplierPortalToken, // Add the token
        currency: payload.currency,
        notes: payload.notes,
        created_by: userId,
        amount: poTotalAmount,
        status: 'Draft',
        company_id: companyId,
        issue_date: payload.issue_date, 
        delivery_date: payload.delivery_date,
    };
    const { data: insertedPO, error: insertError } = await supabaseAdmin
      .from('purchase_orders')
      .insert(poRecord)
      .select()
      .single();
    if (insertError) {
         // Consider what to do if token insert fails due to uniqueness collision (highly unlikely with UUID)
         console.error(`Database Error saving PO: ${insertError.message}`);
         throw new Error(`Database Error saving PO: ${insertError.message}`);
    }
    console.log('Create PO Function: PO saved to DB:', insertedPO.id);

    // 9. Save Line Items (Renumbered)
     if (insertedPO && insertedPO.id && payload.line_items.length > 0) {
         const lineItemsToInsert = payload.line_items.map(item => ({
             purchase_order_id: insertedPO.id,
             description: item.description,
             quantity: item.quantity,
             unit_price: item.unit_price,
             freeagent_category_url: item.category_url,
             // vat_rate: 0.0, 
             line_total: item.quantity * item.unit_price, 
             company_id: companyId, 
         }));
         const { error: linesError } = await supabaseAdmin
             .from('po_lines')
             .insert(lineItemsToInsert);
         // Log error but don't necessarily fail the whole process?
         if (linesError) console.error(`Database Error saving lines: ${linesError.message}`);
         else console.log("Create PO Function: PO Lines saved.");
     }

    // 10. Return Success Response (Renumbered from 9)
    return new Response(JSON.stringify({
        success: true,
        message: 'Purchase Order created successfully.', // UPDATED message
        // Pass back the created PO details from Supabase
        purchaseOrder: insertedPO 
       }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- Error in create-purchase-order Edge Function ---', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    // Try to determine a more specific status code if possible
    let status = 500;
    if (message.includes("authentication") || message.includes("Missing or invalid authorization")) status = 401;
    // else if (message.includes("credentials") || message.includes("FreeAgent client")) status = 503; // Service Unavailable / Config error - Removed FA Client usage
    else if (message.includes("payload")) status = 400; // Bad request
    else if (message.includes("Database Error")) status = 500;
    // else if (message.includes("FreeAgent bill")) status = 502; // Bad Gateway - Removed FA Bill creation
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});