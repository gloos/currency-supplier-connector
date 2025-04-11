import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Define the expected request body type
interface SendPOEmailPayload {
  poId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseAdmin: SupabaseClient | null = null;

  try {
    const { poId }: SendPOEmailPayload = await req.json();
    console.log("Send PO Email Function: Received PO ID:", poId);

    if (!poId) {
      throw new Error("Missing required field: poId");
    }

    // 1. Get Environment Variables
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL');
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL'); // Get App Base URL

    if (!RESEND_API_KEY) {
        console.error("Environment variable RESEND_API_KEY is not set.");
        throw new Error("Resend API Key is not configured.");
    }
    if (!RESEND_FROM_EMAIL) {
        console.warn("Environment variable RESEND_FROM_EMAIL is not set. Using placeholder.");
        // Use a placeholder, but emails likely won't send correctly
        // throw new Error("Resend From Email is not configured."); 
    }
    if (!APP_BASE_URL) {
        console.error("Environment variable APP_BASE_URL is not set.");
        // You might want to throw an error or use a default/placeholder
        throw new Error("Application Base URL is not configured.");
    }
    const fromEmail = RESEND_FROM_EMAIL || 'sender@example.com'; // Fallback placeholder

    // 2. Create Supabase Admin Client
    supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 3. Fetch PO Details from Supabase
    // Fetch PO details, including related company name
    const { data: poData, error: poError } = await supabaseAdmin
        .from('purchase_orders')
        .select(`
            id,
            po_number,
            supplier_email,
            amount,
            currency,
            status,
            supplier_portal_token, 
            company:companies ( name ) 
        `)
        .eq('id', poId)
        .single();

    if (poError) {
        console.error("Database error fetching PO:", poError);
        throw new Error(`Database Error: ${poError.message}`);
    }
    if (!poData) {
        throw new Error(`Purchase Order with ID ${poId} not found.`);
    }
    if (poData.status !== 'Draft') {
         throw new Error(`Purchase Order status is not Draft (Current: ${poData.status}). Cannot send.`);
    }
    if (!poData.supplier_email) {
         throw new Error(`Purchase Order ${poData.po_number} is missing a supplier email address.`);
    }
    if (!poData.supplier_portal_token) {
         // This shouldn't happen if create-po is working, but good to check
         console.error(`PO ${poId} is missing a supplier_portal_token.`);
         throw new Error(`Cannot send email for PO ${poData.po_number}: Missing supplier portal token.`);
    }
    
    // Type assertion after checks
    const companyName = (poData.company as { name: string } | null)?.name ?? 'Your Company';

    // 4. Construct Resend Payload
    const portalUrl = `${APP_BASE_URL.replace(/\/$/, '')}/supplier/${poData.supplier_portal_token}`;
    
    // Basic HTML content - enhance later as needed
    const emailHtml = `
        <h1>Purchase Order ${poData.po_number} from ${companyName}</h1>
        <p>Hello,</p>
        <p>Please find attached or linked the Purchase Order ${poData.po_number}.</p>
        <p>Details:</p>
        <ul>
            <li>PO Number: ${poData.po_number}</li>
            <li>Total Amount: ${poData.amount} ${poData.currency}</li> 
        </ul>
        <p>You can view and manage this PO online here:</p>
        <p><a href="${portalUrl}">${portalUrl}</a></p> 
        <p>Thank you,<br>${companyName}</p>
    `;

    const resendPayload = {
        from: fromEmail,
        to: poData.supplier_email,
        subject: `Purchase Order ${poData.po_number} from ${companyName}`,
        html: emailHtml,
        // bcc: // Optional BCC
        // reply_to: // Optional Reply-To
        // attachments: // Optional attachments (e.g., PDF)
    };

    console.log("Sending email via Resend:", JSON.stringify(resendPayload, null, 2));

    // 5. Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(resendPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
        console.error("Resend API Error:", resendData);
        throw new Error(`Failed to send email via Resend: ${resendData?.message || resendResponse.statusText}`);
    }

    console.log("Resend response success:", resendData);

    // 6. Update PO Status in Supabase
    const { error: updateError } = await supabaseAdmin
        .from('purchase_orders')
        .update({ status: 'SentToSupplier' })
        .eq('id', poId);

    if (updateError) {
        console.error("Database error updating PO status:", updateError);
        // Don't necessarily throw, email was sent, but log critically
        // Maybe attempt retry or flag for manual review?
        return new Response(JSON.stringify({ 
            success: false, 
            message: "Email sent, but failed to update PO status.",
            resend_id: resendData?.id 
        }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    console.log(`PO ${poId} status updated to SentToSupplier.`);

    // 7. Return Success Response
    return new Response(JSON.stringify({
        success: true,
        message: `Purchase Order ${poData.po_number} sent successfully to ${poData.supplier_email}.`,
        resend_id: resendData?.id
       }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- Error in send-po-email Edge Function ---', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    let status = 500;
    // Add specific status codes based on error type
    if (message.includes("Missing required field")) status = 400;
    if (message.includes("not found")) status = 404;
    if (message.includes("configured") || message.includes("API Key")) status = 503; // Service unavailable/misconfigured
    if (message.includes("Resend")) status = 502; // Bad Gateway (error talking to Resend)
    if (message.includes("Database Error")) status = 500;
    if (message.includes("status is not Draft")) status = 409; // Conflict
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
}); 