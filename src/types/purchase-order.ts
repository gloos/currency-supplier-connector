// src/types/purchase-order.ts

// Define the structure for a line item within a Purchase Order
export interface POLineItem {
    id?: string; // Optional ID if it comes from DB
    description: string;
    quantity: number;
    unit_price: number;
    // Add other potential fields from your form/DB schema
    category_id?: string | null; // Or category_url if using FreeAgent URL
    fa_category_url?: string | null;
}

// Define the main structure for a Purchase Order
export interface PurchaseOrder {
    id: string; // Typically UUID from Supabase
    po_number: string;
    company_id: string; // Foreign key to companies table
    supplier_url: string; // FreeAgent contact URL (maps to cached_contacts.freeagent_url)
    issue_date: string; // ISO date string
    delivery_date?: string | null; // ISO date string or null
    currency: string; // 3-letter code
    project_url?: string | null; // FreeAgent project URL (maps to cached_projects.freeagent_url)
    notes?: string | null;
    created_at: string; // ISO timestamp string
    updated_at: string; // ISO timestamp string
    created_by?: string | null; // User ID (UUID)
    // Add relation to line items (typically fetched separately or joined)
    line_items?: POLineItem[]; // Optional: include line items if fetched together

    // Include fields added for FreeAgent linking
    fa_contact_url?: string | null;
    fa_project_url?: string | null;

    // Potential additional status field
    status?: string; // e.g., 'Draft', 'Sent', 'Billed'
} 