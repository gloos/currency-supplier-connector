"use server"; // Directive to mark this as a server-only module

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

export async function handleCreatePurchaseOrder(purchaseOrderData: any) {
  console.log("Creating purchase order with data:", purchaseOrderData);

  let insertedOrder;
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([
        {
          supplier_id: purchaseOrderData.supplierId,
          order_date: purchaseOrderData.orderDate,
          total_amount: purchaseOrderData.totalAmount,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(`Failed to create purchase order in database: ${error.message}`);
    }
    insertedOrder = data;
    console.log("Successfully inserted into Supabase:", insertedOrder);

  } catch (error) {
    console.error("Error during Supabase insertion:", error);
    return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred during database insertion.' };
  }

  const freeagentContactUrl = purchaseOrderData.freeagentContactUrl;
  const freeagentCategoryUrl = purchaseOrderData.freeagentCategoryUrl;
  const freeagentAccessToken = process.env.FREEAGENT_ACCESS_TOKEN;

  if (!freeagentAccessToken) {
      console.error("FreeAgent Access Token is missing.");
      return { success: false, message: 'FreeAgent authentication is required.' };
  }

  if (!freeagentContactUrl) {
      console.error("FreeAgent Contact URL is missing.");
      return { success: false, message: 'Supplier is not linked to a FreeAgent contact.' };
  }

  const freeagentBillPayload = {
    bill: {
      contact: freeagentContactUrl,
      dated_on: purchaseOrderData.orderDate,
      due_on: purchaseOrderData.dueDate,
      reference: `PO-${insertedOrder?.id || purchaseOrderData.reference}`,
      comments: purchaseOrderData.comments || 'Purchase Order',
      currency: purchaseOrderData.currency,
      bill_items: purchaseOrderData.items.map((item: any, index: number) => {
        // Calculate total value for the item
        const totalValue = (item.quantity * item.unitPrice).toFixed(2); // Ensure 2 decimal places
        
        return {
          description: item.description,
          // Remove quantity, price_per_unit, unit
          // quantity: item.quantity.toString(),
          // price_per_unit: item.unitPrice.toString(),
          // unit: 'unit',
          total_value: totalValue.toString(), // Send total_value as a string
          category: freeagentCategoryUrl,
          sales_tax_rate: "0.0", // Keep tax rate
          sales_tax_status: "OUT_OF_SCOPE" 
        }
      }),
    },
  };

  console.log("Constructed FreeAgent Payload:", JSON.stringify(freeagentBillPayload, null, 2));

  try {
    const freeagentApiUrl = 'https://api.freeagent.com/v2/bills';
    const response = await fetch(freeagentApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${freeagentAccessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(freeagentBillPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("FreeAgent API error response:", errorBody);
      throw new Error(`FreeAgent API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`);
    }

    const freeagentBill = await response.json();
    console.log("Successfully created FreeAgent Bill:", freeagentBill);

    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({ freeagent_bill_url: freeagentBill.bill.url })
      .match({ id: insertedOrder.id });

    if (updateError) {
        console.error("Supabase update error after FreeAgent success:", updateError);
    }

    return { success: true, message: 'Purchase Order created successfully in Supabase and FreeAgent.', data: { supabaseOrder: insertedOrder, freeagentBill: freeagentBill.bill } };

  } catch (error) {
    console.error("Error creating FreeAgent Bill:", error);
    return { success: false, message: `Failed to create bill in FreeAgent. ${error instanceof Error ? error.message : 'An unknown error occurred.'} Purchase order was created in database but not in FreeAgent.` };
  }
} 