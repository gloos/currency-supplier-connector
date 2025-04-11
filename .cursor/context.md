Context & Rules for Cursor AI Assistant: Purchase Order Tool

**Project Stack:**

*   **Frontend Framework:** React
*   **Build Tool / Dev Server:** Vite
*   **Routing:** React Router (react-router-dom)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** Shadcn UI (Radix UI primitives)
*   **Database / Backend:** Supabase (BaaS)
*   **Data Fetching / State Management:** TanStack Query (React Query)
*   **Primary External Integration:** FreeAgent API
*   **Target AI:** Cursor

**1. Project Overview**

*   **Goal:** Build a tool for managing project profitability by streamlining Purchase Order (PO) creation, supplier interaction (PO acceptance, invoice submission), and automated FreeAgent Bill creation upon invoice approval.
*   **Primary Integration:** FreeAgent (Financial Accounting Software). API Docs: https://dev.freeagent.com/docs
*   **Database:** Supabase (PostgreSQL + APIs). API Docs: https://supabase.com/docs/guides/api

**2. Core Entities & Data Flow**

*   **Users:** Stored in Supabase Auth. Associated with a Company.
*   **Companies:** Details synced from FreeAgent (`GET /company`) upon signup/connection, stored in Supabase (`companies`, `company_details`). Includes logo.
*   **Projects:** Created within the app *and* mirrored in FreeAgent (`POST /projects`). Includes an initial 'Invoicing Amount' used to create a *Draft Invoice* in FreeAgent (`POST /invoices`). Project details cached/stored in Supabase (`cached_projects` or dedicated `projects` table).
*   **Contacts (Suppliers):** Synced from FreeAgent (`GET /contacts`), stored in Supabase (`cached_contacts`). Used when creating POs.
*   **Purchase Orders (POs):** Created by app users, linked to a Project and Supplier. Stored in Supabase (`purchase_orders`, `po_lines`). Emailed to the supplier.
*   **Supplier Actions:** Suppliers Accept/Reject POs via a unique portal link. Status updated in Supabase.
*   **Uploaded Invoices:** Suppliers upload their invoices for completed POs via the portal. Files stored in Supabase Storage, metadata in `uploaded_invoices` table, linked to the PO.
*   **Invoice Approval:** App Admin approves/rejects uploaded invoices within the app. Status updated in `uploaded_invoices` and `purchase_orders`.
*   **Bills (FreeAgent):** Created via API (`POST /bills`) *only after* an Admin approves the corresponding uploaded invoice. The uploaded invoice file is attached (`POST /bills/{id}/attachments`). The `freeagent_bill_id` is stored back on the Supabase `purchase_orders` record.

**3. User Roles & Permissions**

*   **Authentication:** Handled via Supabase Auth. RLS enforces company-level data access.
*   **App User (Admin/Project Manager):**
    *   Connects/Manages FreeAgent integration (Settings).
    *   Creates Projects (including invoicing amount).
    *   Creates and sends Purchase Orders linked to projects.
    *   Views Dashboard (Project Profitability).
    *   Views PO List & Details.
    *   **Admin Only:** Approves/Rejects uploaded supplier invoices. (Need to add role differentiation in `company_users` and RLS/UI checks).
    *   Manages company settings (e.g., logo).
*   **Supplier (External):**
    *   Receives PO email with a unique link to a portal.
    *   Views PO details in the portal.
    *   Accepts or Rejects the PO via the portal.
    *   Uploads their invoice for the PO via the portal.

**4. Database Schema (Supabase - Target)**

*   **users:** Standard Supabase auth users table.
*   **companies:** `id`, `name`, `slug`, `fa_company_url`, `fa_company_name`, `fa_default_currency`, `created_at`, `updated_at`.
*   **company_details:** `company_id` (FK to companies, PK), `name`, `address`, `registration_number`, `sales_tax_registration_number`, `logo_storage_path`, `last_synced_at`.
*   **company_users:** `user_id` (FK to auth.users), `company_id` (FK to companies), `role` (TEXT, e.g., 'Admin', 'Manager'), `created_at`. (PK on user_id, company_id).
*   **freeagent_credentials:** `id`, `company_id` (FK to companies, UNIQUE), `access_token`, `refresh_token`, `expires_at`, `client_id`, `created_at`, `updated_at`.
*   **cached_contacts:** `id`, `company_id`, `freeagent_url` (UNIQUE), `name`, `first_name`, `last_name`, `email`, `billing_email`, `is_supplier`, `is_customer`, `raw_data`, `synced_at`.
*   **cached_projects:** `id`, `company_id`, `freeagent_url` (UNIQUE), `name`, `status`, `freeagent_contact_url`, `initial_invoicing_amount` (Numeric, set during creation), `freeagent_draft_invoice_url` (TEXT, optional), `raw_data`, `synced_at`. *(Consider renaming to `projects` if app manages more state)*.
*   **cached_categories:** `id`, `company_id`, `freeagent_url` (UNIQUE), `nominal_code`, `description`, `category_type`, `allowable_for_tax`, `raw_data`, `synced_at`.
*   **purchase_orders:**
    *   `id` (UUID, PK)
    *   `po_number` (TEXT)
    *   `company_id` (UUID, FK to companies)
    *   `project_id` (UUID, FK to cached_projects/projects) - *Using internal ID is better than FA URL*
    *   `supplier_contact_id` (UUID, FK to cached_contacts) - *Using internal ID*
    *   `supplier_email` (TEXT) - *For sending PO*
    *   `currency` (TEXT, 3 chars)
    *   `issue_date` (DATE)
    *   `delivery_date` (DATE, nullable)
    *   `notes` (TEXT, nullable)
    *   `amount` (NUMERIC, calculated initial total)
    *   `status` (TEXT, e.g., 'Draft', 'SentToSupplier', 'AcceptedBySupplier', 'RejectedBySupplier', 'InvoiceUploaded', 'InvoicePendingApproval', 'InvoiceApproved', 'InvoiceRejected', 'BilledInFreeAgent', 'Closed', 'Cancelled')
    *   `freeagent_bill_url` (TEXT, nullable) - *Store URL instead of just ID*
    *   `supplier_portal_token` (TEXT, unique, for supplier access link)
    *   `created_at` (TIMESTAMPTZ)
    *   `updated_at` (TIMESTAMPTZ)
    *   `created_by` (UUID, FK to auth.users)
*   **po_lines:**
    *   `id` (UUID, PK)
    *   `purchase_order_id` (UUID, FK to purchase_orders)
    *   `description` (TEXT)
    *   `quantity` (NUMERIC)
    *   `unit_price` (NUMERIC)
    *   `category_id` (UUID, FK to cached_categories, nullable) - *Using internal ID*
    *   `line_total` (NUMERIC, calculated)
    *   `company_id` (UUID, FK to companies)
*   **uploaded_invoices:**
    *   `id` (UUID, PK)
    *   `purchase_order_id` (UUID, FK to purchase_orders, UNIQUE)
    *   `company_id` (UUID, FK to companies)
    *   `storage_path` (TEXT) - Path in Supabase Storage
    *   `filename` (TEXT)
    *   `content_type` (TEXT)
    *   `size_bytes` (BIGINT)
    *   `supplier_invoice_number` (TEXT, nullable) - Entered by supplier
    *   `supplier_invoice_amount` (NUMERIC, nullable) - Entered by supplier
    *   `status` (TEXT, e.g., 'PendingApproval', 'Approved', 'Rejected')
    *   `uploaded_at` (TIMESTAMPTZ)
    *   `approved_or_rejected_at` (TIMESTAMPTZ, nullable)
    *   `approved_or_rejected_by` (UUID, FK to auth.users, nullable)

**5. FreeAgent API Interaction**

*   **Authentication:** OAuth2 (handled by `freeagent-oauth-callback` function). Token refresh handled by `getFreeAgentClient`.
*   **Key Endpoints:**
    *   `GET /company`: Sync company details on connect/periodically.
    *   `GET /contacts`: Sync contacts (suppliers) on connect/periodically/manual trigger.
    *   `GET /projects`: Sync projects on connect/periodically/manual trigger.
    *   `POST /projects`: Create a new project in FreeAgent when created in the app.
    *   `GET /categories`: Sync expense categories on connect/periodically/manual trigger.
    *   `POST /invoices`: Create a *Draft* invoice in FreeAgent when a project is created in the app.
    *   `GET /invoices`: Potentially fetch actual sent/paid invoice amounts per project for accurate dashboard profit calculation. [Needs Clarification: Is dashboard profit based on Draft Invoice amount or Actual Sent Invoice amounts?]
    *   `POST /bills`: Create a Bill in FreeAgent *after* an uploaded invoice is approved in the app. Payload includes contact, date, currency, items (from approved invoice), and reference.
    *   `POST /bills/{bill_id}/attachments`: Attach the uploaded invoice file (from Supabase Storage) to the newly created FreeAgent Bill.
    *   `GET /bills`: Potentially check Bill status for reconciliation or dashboard info.

**6. Feature Specifications**

*   **User Signup/Login:** Standard email/password via Supabase Auth. Automatic company creation/linking during signup.
*   **Settings Page:**
    *   Connect/Disconnect FreeAgent (OAuth flow).
    *   Manually trigger FreeAgent data sync (Contacts, Projects, Categories, Company Info).
    *   Display connection status and last sync time.
    *   Manage Company Logo (Upload/View).
*   **Project Creation:**
    *   UI: Form to input Project Name, select FreeAgent Contact (Customer), enter initial 'Invoicing Amount', Currency.
    *   Action:
        1.  Call Edge Function (`create-project`).
        2.  Function calls `POST /projects` to create FA Project.
        3.  Function calls `POST /invoices` to create FA Draft Invoice linked to the new project, using the 'Invoicing Amount'.
        4.  Function saves project details (including FA URLs, invoicing amount) to Supabase (`cached_projects`).
        5.  User feedback.
*   **Purchase Order Creation:**
    *   UI: Form (likely `/company/:slug/purchase-orders/new`).
    *   User Input: Select existing Project (from Supabase `cached_projects`), PO Number, select Supplier (from Supabase `cached_contacts`), Issue Date, Delivery Date (opt), Currency (default from project/company), Notes, Line Items (Description, Qty, Unit Price, select Category from Supabase `cached_categories`).
    *   Action (`Create & Send PO` Button):
        1.  Validate inputs.
        2.  Call Edge Function (`create-purchase-order`).
        3.  Function generates unique `supplier_portal_token`.
        4.  Function saves PO and Line Items to Supabase (`purchase_orders`, `po_lines`) with status `SentToSupplier`.
        5.  Function triggers email to `supplier_email` containing PO details and the unique portal link (`/supplier/{supplier_portal_token}`).
        6.  User feedback (PO Sent).
*   **Supplier Portal (`/supplier/:token`):**
    *   Access: Via unique token link. Verify token against `purchase_orders`.
    *   Display: Read-only PO details.
    *   Actions:
        *   "Accept PO": Calls Edge Function (`update-po-status`) -> Sets PO status to `AcceptedBySupplier`. Notifies app user. Enables Invoice Upload section.
        *   "Reject PO": Calls Edge Function (`update-po-status`) -> Sets PO status to `RejectedBySupplier`. Notifies app user. Disables Invoice Upload.
        *   Invoice Upload (if Accepted): Form to upload invoice PDF, enter Supplier Invoice #, Supplier Invoice Amount. Calls Edge Function (`upload-supplier-invoice`) -> Saves file to Storage, creates `uploaded_invoices` record with status `PendingApproval`. Sets PO status to `InvoiceUploaded`. Notifies app user (Admin).
*   **Invoice Approval (Admin UI):**
    *   UI: Section/Page showing POs with status `InvoiceUploaded` or `InvoicePendingApproval`. Displays PO details, link to uploaded invoice file, Supplier Invoice #/Amount.
    *   Actions:
        *   "Approve Invoice": Calls Edge Function (`approve-invoice`) -> Updates `uploaded_invoices` status to `Approved`. Updates `purchase_orders` status to `InvoiceApproved`. **Crucially, triggers the `create-bill-from-invoice` Edge Function.**
        *   "Reject Invoice": Calls Edge Function (`reject-invoice`) -> Updates `uploaded_invoices` status to `Rejected`. Updates `purchase_orders` status to `InvoiceRejected` (or similar). Optionally notifies supplier.
*   **Bill Creation (Automated on Approval):**
    *   Triggered by `approve-invoice` function.
    *   Edge Function (`create-bill-from-invoice`):
        1.  Fetches PO details and approved `uploaded_invoices` data.
        2.  Fetches invoice file from Supabase Storage.
        3.  Calls `POST /bills` in FreeAgent using data from the *approved invoice* (amount, items might differ slightly from PO).
        4.  Gets the new `freeagent_bill_url`.
        5.  Calls `POST /bills/{bill_id}/attachments` to attach the invoice file.
        6.  Updates Supabase `purchase_orders`: sets `status` to `BilledInFreeAgent`, stores `freeagent_bill_url`.
*   **Dashboard:**
    *   UI: Display list/cards of Projects.
    *   Data per Project:
        *   Project Name (from `cached_projects`).
        *   Invoicing Amount (from `cached_projects.initial_invoicing_amount`). [Needs Clarification: Or use actual FA Invoice sum?]
        *   Total PO Cost (Sum of `amount` from related `purchase_orders` in Supabase). [Needs Clarification: Or use actual FA Bill sum?]
        *   Calculated Profit Margin (`Invoicing Amount` - `Total PO Cost`).
        *   Maybe summary of PO statuses for the project.

**7. General Rules & Assumptions**

*   **Error Handling:** Implement robust error handling and user feedback (toasts) for all user actions and API calls.
*   **Security:** Use Supabase RLS extensively. Ensure Edge Functions validate user permissions/company ownership. Securely store FreeAgent credentials (use Supabase Vault if possible for `access_token`, `refresh_token`). Ensure `supplier_portal_token` is unique and non-guessable. Protect file uploads (size, type, scanning).
*   **Data Consistency:**
    *   Source of Truth:
        *   Company, Contacts, Categories, Project *metadata*: FreeAgent (synced to Supabase cache).
        *   Project *creation data* (Invoicing Amount): App/Supabase.
        *   PO details: App/Supabase (`purchase_orders`, `po_lines`).
        *   Uploaded Invoice: App/Supabase (`uploaded_invoices`, Storage).
        *   Bill details: FreeAgent (linked from Supabase PO).
    *   Sync Strategy: Initial sync via Settings. Need strategy for ongoing updates (manual trigger, scheduled function, or webhooks if FA supports them).
*   **UI/UX:** Standard web patterns. Use loading states. Ensure clear status indicators. Mobile responsiveness.
*   **Email:** Use a reliable email service (e.g., Resend, SendGrid) triggered via an Edge Function for sending POs and notifications. Do not send directly from the frontend.
*   **PDF Generation:** If "Download PO" is required, implement PDF generation server-side (Edge Function) or client-side (library like `jspdf`).