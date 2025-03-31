export interface FreeAgentCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
}

export interface Contact {
  url: string;
  contact_name_on_invoices: boolean;
  created_at: string;
  updated_at: string;
  organisation_name: string;
  first_name: string;
  last_name: string;
  email: string;
  billing_email: string;
  phone_number: string;
  mobile: string;
  website: string;
  currency: string;
  status: string;
  uses_contact_invoice_sequence: boolean;
}

export interface PurchaseOrder {
  id: string;
  supplierRef: string;
  reference: string;
  currencyCode: string;
  issueDate: string;
  items: PurchaseOrderItem[];
  total: number;
  notes?: string;
}

export interface PurchaseOrderItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Bill {
  reference: string;
  dated_on: string;
  due_on: string;
  currency: string;
  supplier_id: string;
  total_value: number;
  status: "Draft" | "Open" | "Scheduled" | "Paid";
}

// Database table interfaces
export interface FreeAgentCredentialsTable {
  id: number;
  client_id: string;
  client_secret: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PreferencesTable {
  id: number;
  auto_create_bills: boolean;
  default_currency: string;
  created_at: string | null;
  updated_at: string | null;
} 