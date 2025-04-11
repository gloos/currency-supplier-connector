import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Function to safely parse numeric values from form data
const safeParseFloat = (value: FormDataEntryValue | null): number | null => {
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseAdmin: SupabaseClient | null = null;

  try {
    // 1. Parse FormData
    const formData = await req.formData();
    const token = formData.get('token') as string | null;
    const invoiceFile = formData.get('invoiceFile') as File | null;
    const supplierInvoiceNumber = formData.get('supplierInvoiceNumber') as string | null;
    const supplierInvoiceAmount = safeParseFloat(formData.get('supplierInvoiceAmount'));

    console.log("Upload Invoice Function: Received token:", token, "File:", invoiceFile?.name);

    if (!token || !invoiceFile || !supplierInvoiceNumber || supplierInvoiceAmount === null) {
      console.error("Missing form data:", { token: !!token, invoiceFile: !!invoiceFile, supplierInvoiceNumber: !!supplierInvoiceNumber, supplierInvoiceAmount: supplierInvoiceAmount !== null });
      throw new Error("Missing required form fields: token, invoiceFile, supplierInvoiceNumber, supplierInvoiceAmount");
    }

    // 2. Create Supabase Admin Client
    supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 3. Find PO by token and check status
    const { data: poData, error: fetchError } = await supabaseAdmin
        .from('purchase_orders')
        .select('id, po_number, status, company_id')
        .eq('supplier_portal_token', token)
        .single();

    if (fetchError) {
        console.error("Database error fetching PO by token:", fetchError);
        if (fetchError.code === 'PGRST116') throw new Error("Invalid or expired token. Purchase order not found.");
        throw new Error(`Database Error fetching PO: ${fetchError.message}`);
    }
    if (!poData) throw new Error("Invalid or expired token. Purchase order not found.");

    // 4. Validate current status
    if (poData.status !== 'AcceptedBySupplier') {
        console.warn(`PO ${poData.id} status is ${poData.status}. Cannot upload invoice.`);
        throw new Error(`Invoice cannot be uploaded for this purchase order (Status: ${poData.status}).`);
    }

    // 5. Upload file to Supabase Storage
    const storagePath = `${poData.company_id}/${poData.id}/${invoiceFile.name}`;
    console.log(`Uploading file to storage path: ${storagePath}`);
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('supplier-invoices') // Make sure this bucket name matches the one you created
      .upload(storagePath, invoiceFile, {
        cacheControl: '3600',
        upsert: true, // Overwrite if file with same name exists for this PO/company
        contentType: invoiceFile.type
      });

    if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(`Failed to upload invoice file: ${uploadError.message}`);
    }
    console.log("File uploaded successfully:", uploadData);

    // 6. Insert record into uploaded_invoices table
    const uploadedInvoiceRecord = {
      purchase_order_id: poData.id,
      company_id: poData.company_id,
      storage_path: storagePath, // Use the path used for upload
      filename: invoiceFile.name,
      content_type: invoiceFile.type,
      size_bytes: invoiceFile.size,
      supplier_invoice_number: supplierInvoiceNumber,
      supplier_invoice_amount: supplierInvoiceAmount,
      status: 'PendingApproval', // Default status from table schema
      // uploaded_at: default now()
    };

    const { data: insertedInvoice, error: insertError } = await supabaseAdmin
        .from('uploaded_invoices')
        .insert(uploadedInvoiceRecord)
        .select('id') // Select only ID for confirmation
        .single();

    if (insertError) {
        console.error("Database error inserting uploaded_invoice record:", insertError);
        // Attempt to delete the uploaded file if DB insert fails?
        // await supabaseAdmin.storage.from('supplier-invoices').remove([storagePath]);
        throw new Error(`Database error saving invoice record: ${insertError.message}`);
    }
    console.log(`Uploaded invoice record created: ${insertedInvoice.id}`);

    // 7. Update PO Status to InvoiceUploaded
    const { error: updatePoError } = await supabaseAdmin
        .from('purchase_orders')
        .update({ status: 'InvoiceUploaded' })
        .eq('id', poData.id);

    if (updatePoError) {
         console.error(`Database error updating PO ${poData.id} status to InvoiceUploaded:`, updatePoError);
        // Log error but don't fail the overall process - invoice was uploaded and recorded
    }
    console.log(`PO ${poData.id} status updated to InvoiceUploaded.`);

    // TODO: Notify app admin about the uploaded invoice

    // 8. Return Success Response
    return new Response(JSON.stringify({
        success: true,
        message: `Invoice ${invoiceFile.name} uploaded successfully for PO ${poData.po_number}.`,
        invoiceId: insertedInvoice.id,
        storagePath: storagePath
       }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- Error in upload-supplier-invoice Edge Function ---', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';
    let status = 500;
    // Set appropriate HTTP status codes
    if (message.includes("Missing form fields")) status = 400;
    if (message.includes("not found")) status = 404;
    if (message.includes("Cannot upload invoice")) status = 409; // Conflict
    if (message.includes("Failed to upload")) status = 500; // Storage issue
    if (message.includes("Database error")) status = 500;
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
}); 