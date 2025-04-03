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
          freeagent_contact_url: string | null
          freeagent_url: string
          id: string
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
          freeagent_contact_url?: string | null
          freeagent_url: string
          id?: string
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
          freeagent_contact_url?: string | null
          freeagent_url?: string
          id?: string
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
          client_secret: string
          company_id: string | null
          created_at: string | null
          expires_at: string | null
          id: number
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          client_id: string
          client_secret: string
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id: number
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          client_id?: string
          client_secret?: string
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: number
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
          id: string
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
          id?: string
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
          id?: string
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
          company_id: string
          created_at: string | null
          currency: string
          description: string | null
          fa_contact_url: string | null
          fa_project_url: string | null
          freeagent_bill_id: string | null
          id: string
          po_number: string
          status: string | null
          supplier_email: string | null
          supplier_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          currency?: string
          description?: string | null
          fa_contact_url?: string | null
          fa_project_url?: string | null
          freeagent_bill_id?: string | null
          id?: string
          po_number: string
          status?: string | null
          supplier_email?: string | null
          supplier_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          fa_contact_url?: string | null
          fa_project_url?: string | null
          freeagent_bill_id?: string | null
          id?: string
          po_number?: string
          status?: string | null
          supplier_email?: string | null
          supplier_name?: string
          updated_at?: string | null
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      slugify: {
        Args: {
          "": string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
