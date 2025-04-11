export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cached_categories: {
        Row: {
          allowable_for_tax: boolean | null
          category_type: string | null
          company_id: string
          created_at: string | null
          description: string | null
          freeagent_url: string
          id: string
          nominal_code: string | null
          raw_data: Json | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          allowable_for_tax?: boolean | null
          category_type?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          freeagent_url: string
          id?: string
          nominal_code?: string | null
          raw_data?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          allowable_for_tax?: boolean | null
          category_type?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          freeagent_url?: string
          id?: string
          nominal_code?: string | null
          raw_data?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cached_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cached_contacts: {
        Row: {
          billing_email: string | null
          company_id: string
          created_at: string | null
          email: string | null
          first_name: string | null
          freeagent_url: string
          id: string
          is_customer: boolean | null
          is_supplier: boolean | null
          last_name: string | null
          name: string | null
          raw_data: Json | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_email?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          freeagent_url: string
          id?: string
          is_customer?: boolean | null
          is_supplier?: boolean | null
          last_name?: string | null
          name?: string | null
          raw_data?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_email?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          freeagent_url?: string
          id?: string
          is_customer?: boolean | null
          is_supplier?: boolean | null
          last_name?: string | null
          name?: string | null
          raw_data?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cached_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cached_projects: {
        Row: {
          budget_units: number | null
          company_id: string
          created_at: string | null
          currency: string | null
          freeagent_contact_url: string | null
          freeagent_draft_invoice_url: string | null
          freeagent_url: string
          id: string
          initial_invoicing_amount: number | null
          is_ir35: boolean | null
          name: string | null
          raw_data: Json | null
          status: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          budget_units?: number | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          freeagent_contact_url?: string | null
          freeagent_draft_invoice_url?: string | null
          freeagent_url: string
          id?: string
          initial_invoicing_amount?: number | null
          is_ir35?: boolean | null
          name?: string | null
          raw_data?: Json | null
          status?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_units?: number | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          freeagent_contact_url?: string | null
          freeagent_draft_invoice_url?: string | null
          freeagent_url?: string
          id?: string
          initial_invoicing_amount?: number | null
          is_ir35?: boolean | null
          name?: string | null
          raw_data?: Json | null
          status?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cached_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          fa_company_name: string | null
          fa_company_url: string | null
          fa_default_currency: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fa_company_name?: string | null
          fa_company_url?: string | null
          fa_default_currency?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fa_company_name?: string | null
          fa_company_url?: string | null
          fa_default_currency?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_details: {
        Row: {
          address: string | null
          company_id: string
          last_synced_at: string
          logo_storage_path: string | null
          name: string
          registration_number: string | null
          sales_tax_registration_number: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          last_synced_at?: string
          logo_storage_path?: string | null
          name: string
          registration_number?: string | null
          sales_tax_registration_number?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          last_synced_at?: string
          logo_storage_path?: string | null
          name?: string
          registration_number?: string | null
          sales_tax_registration_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freeagent_credentials: {
        Row: {
          access_token: string | null
          client_id: string
          client_secret: string | null
          company_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          old_id: number | null
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          client_id: string
          client_secret?: string | null
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          old_id?: number | null
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          client_id?: string
          client_secret?: string | null
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          old_id?: number | null
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freeagent_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      po_lines: {
        Row: {
          company_id: string
          created_at: string
          description: string
          fa_category_url: string | null
          freeagent_category_url: string | null
          id: string
          line_total: number | null
          purchase_order_id: string
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          fa_category_url?: string | null
          freeagent_category_url?: string | null
          id?: string
          line_total?: number | null
          purchase_order_id: string
          quantity: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          fa_category_url?: string | null
          freeagent_category_url?: string | null
          id?: string
          line_total?: number | null
          purchase_order_id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_poline_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_poline_fa_category"
            columns: ["fa_category_url"]
            isOneToOne: false
            referencedRelation: "cached_categories"
            referencedColumns: ["freeagent_url"]
          },
          {
            foreignKeyName: "po_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          auto_create_bills: boolean | null
          company_id: string | null
          created_at: string | null
          default_currency: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          auto_create_bills?: boolean | null
          company_id?: string | null
          created_at?: string | null
          default_currency?: string | null
          id: number
          updated_at?: string | null
        }
        Update: {
          auto_create_bills?: boolean | null
          company_id?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          amount: number
          amount_legacy: number | null
          company_id: string
          created_at: string | null
          created_by: string
          currency: string
          delivery_date: string | null
          description: string | null
          fa_contact_url: string | null
          fa_project_url: string | null
          freeagent_bill_id: string | null
          freeagent_contact_url: string | null
          freeagent_project_url: string | null
          id: string
          issue_date: string
          notes: string | null
          po_number: string
          status: Database["public"]["Enums"]["po_status"] | null
          supplier_email: string | null
          supplier_name: string
          supplier_portal_token: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_legacy?: number | null
          company_id: string
          created_at?: string | null
          created_by: string
          currency?: string
          delivery_date?: string | null
          description?: string | null
          fa_contact_url?: string | null
          fa_project_url?: string | null
          freeagent_bill_id?: string | null
          freeagent_contact_url?: string | null
          freeagent_project_url?: string | null
          id?: string
          issue_date: string
          notes?: string | null
          po_number: string
          status?: Database["public"]["Enums"]["po_status"] | null
          supplier_email?: string | null
          supplier_name: string
          supplier_portal_token?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_legacy?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          currency?: string
          delivery_date?: string | null
          description?: string | null
          fa_contact_url?: string | null
          fa_project_url?: string | null
          freeagent_bill_id?: string | null
          freeagent_contact_url?: string | null
          freeagent_project_url?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          po_number?: string
          status?: Database["public"]["Enums"]["po_status"] | null
          supplier_email?: string | null
          supplier_name?: string
          supplier_portal_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_po_fa_contact"
            columns: ["fa_contact_url"]
            isOneToOne: false
            referencedRelation: "cached_contacts"
            referencedColumns: ["freeagent_url"]
          },
          {
            foreignKeyName: "fk_po_fa_project"
            columns: ["fa_project_url"]
            isOneToOne: false
            referencedRelation: "cached_projects"
            referencedColumns: ["freeagent_url"]
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_invoices: {
        Row: {
          approved_or_rejected_at: string | null
          approved_or_rejected_by: string | null
          company_id: string
          content_type: string
          filename: string
          id: string
          purchase_order_id: string
          size_bytes: number
          status: Database["public"]["Enums"]["invoice_upload_status"]
          storage_path: string
          supplier_invoice_amount: number | null
          supplier_invoice_number: string | null
          uploaded_at: string
        }
        Insert: {
          approved_or_rejected_at?: string | null
          approved_or_rejected_by?: string | null
          company_id: string
          content_type: string
          filename: string
          id?: string
          purchase_order_id: string
          size_bytes: number
          status?: Database["public"]["Enums"]["invoice_upload_status"]
          storage_path: string
          supplier_invoice_amount?: number | null
          supplier_invoice_number?: string | null
          uploaded_at?: string
        }
        Update: {
          approved_or_rejected_at?: string | null
          approved_or_rejected_by?: string | null
          company_id?: string
          content_type?: string
          filename?: string
          id?: string
          purchase_order_id?: string
          size_bytes?: number
          status?: Database["public"]["Enums"]["invoice_upload_status"]
          storage_path?: string
          supplier_invoice_amount?: number | null
          supplier_invoice_number?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: true
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      slugify: {
        Args: { "": string }
        Returns: string
      }
    }
    Enums: {
      invoice_upload_status: "PendingApproval" | "Approved" | "Rejected"
      po_status:
        | "Draft"
        | "SentToSupplier"
        | "AcceptedBySupplier"
        | "RejectedBySupplier"
        | "InvoiceUploaded"
        | "InvoicePendingApproval"
        | "InvoiceApproved"
        | "BilledInFreeAgent"
        | "Closed"
        | "Cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      invoice_upload_status: ["PendingApproval", "Approved", "Rejected"],
      po_status: [
        "Draft",
        "SentToSupplier",
        "AcceptedBySupplier",
        "RejectedBySupplier",
        "InvoiceUploaded",
        "InvoicePendingApproval",
        "InvoiceApproved",
        "BilledInFreeAgent",
        "Closed",
        "Cancelled",
      ],
    },
  },
} as const
