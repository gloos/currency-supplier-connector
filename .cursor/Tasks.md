Here are the project features. Keep this file up to date and ask me before amending.

**Features Implemented (or Partially Implemented):**

1.  **User Authentication & Company Association:**
    *   Supabase Auth for login/signup (`AuthPage.tsx`, `AuthContext.tsx`).
    *   Linking users to companies (`company_users` table, `AuthContext.tsx` fetches this).
    *   Basic routing based on auth state (`App.tsx`, `ProtectedRoute.tsx` - though `ProtectedRoute` isn't directly used in `App.tsx`, the logic is in `AppRoutes`).
    *   Company slug-based routing (`App.tsx`).
2.  **FreeAgent Connection:**
    *   OAuth flow initiation (`freeagent-api.ts` -> `getAuthUrl`).
    *   OAuth callback handling (`freeagent-oauth-callback` Edge Function).
    *   Storing credentials (`freeagent_credentials` table).
    *   Token refresh logic (`_shared/freeagent.ts`).
    *   Basic connection status display (`Settings.tsx`).
    *   Disconnect functionality (`Settings.tsx`, `freeagent-api.ts` - *needs security review*).
3.  **Data Syncing (Initial):**
    *   `sync-freeagent-data` Edge Function fetches Company Info, Contacts, Projects (Active), and Categories.
    *   Data is stored in `companies`, `company_details`, `cached_contacts`, `cached_projects`, `cached_categories`.
    *   Manual sync trigger in `Settings.tsx`.
4.  **Purchase Order Creation (UI & Basic DB):**
    *   PO Form (`po-form.tsx`) with validation (Zod).
    *   Dropdowns for Suppliers (Contacts), Projects, Categories populated from cached Supabase data.
    *   Line item management (add/remove).
    *   Submission triggers `create-purchase-order` Edge Function.
5.  **Purchase Order Listing & Viewing:**
    *   `POList.tsx` fetches and displays POs for the company from Supabase.
    *   `PODetail.tsx` fetches and displays a single PO with line items from Supabase.
    *   Basic display of PO details, status, totals.
6.  **Company Logo Upload:**
    *   Functionality in `Settings.tsx` to upload a logo to Supabase Storage and link it in `company_details`.
7.  **Basic UI Components & Layout:**
    *   Shadcn UI components are integrated.
    *   A `MainLayout.tsx` provides a consistent header/nav structure for authenticated, company-associated routes.
    *   `Navbar.tsx` provides dynamic navigation based on auth state and company slug.

**Remaining Tasks & Missing Features:**

**I. Core Workflow & Logic Issues:**

~~1.  **Incorrect Bill Creation Flow:**~~
    *   ~~**Task:** Modify the `create-purchase-order` Edge Function. It currently creates a FreeAgent Bill *immediately* upon PO creation. This is incorrect according to your specified workflow.~~
    *   ~~**Action:** Remove the FreeAgent Bill creation logic from this function. Its primary responsibility should be validating the input and saving the `purchase_orders` and `po_lines` records to Supabase. It might also trigger the initial PO email.~~
2.  **Implement Project Creation:**
    *   **Task:** Create UI (likely a new page/modal) for creating projects.
    *   **Action:** This UI should capture project details (name, contact, invoicing amount, etc.).
    *   **Action:** Create a new Supabase Edge Function (`create-project`?) that:
        *   Takes project details from the frontend.
        *   Calls the FreeAgent API (`POST /v2/projects`) to create the project in FreeAgent.
        *   Saves the project details (including the FreeAgent URL/ID) to your `cached_projects` table (or a dedicated `projects` table if you prefer).
        *   Optionally, create the draft invoice in FreeAgent (`POST /v2/invoices` with `status=Draft`) linked to the new project, using the provided invoicing amount. Store the draft invoice URL/ID if needed.
~~3.  **Implement PO Status Tracking:**~~
    *   **Task:** Define and manage PO statuses beyond the basic 'Pending'/'Sent'/'Completed' currently hinted at.
    *   **Action:** Update the `purchase_orders` table schema to include a more detailed status enum (e.g., `Draft`, `SentToSupplier`, `AcceptedBySupplier`, `RejectedBySupplier`, `InvoiceUploaded`, `InvoiceApproved`, `BilledInFreeAgent`, `Closed`, `Cancelled`).
    *   **Action:** Update the `create-purchase-order` function to set the initial status (e.g., `Draft` or `SentToSupplier` if email is sent immediately).
    *   **Action:** Add logic/endpoints for suppliers to update the status (Accept/Reject - see below).
    *   **Action:** Update UI (`POList`, `PODetail`) to reflect these statuses clearly.
~~4.  **Implement Initial PO Email Sending:**~~
    *   ~~**Task:** Send the PO email to the supplier automatically when a PO is created (or via a separate "Send" action).~~
    *   ~~**Action:** Decide *when* the email is sent (immediately on creation vs. manual trigger).~~
    *   ~~**Action:** Integrate `email-service.ts` (or a real email provider via an Edge Function) into the PO creation/sending flow. Pass necessary PO data (details, PDF link/content).~~
    *   ~~**Action:** Update the PO status to `SentToSupplier` after successful sending.~~
~~5.  **Implement Supplier Interaction Portal:**~~
    *   **Task:** Create the supplier-facing portal.
    *   **Action:** Design the workflow: How does the supplier access it? (Unique link per PO emailed? Supplier accounts?).
    *   **Action:** Create frontend pages for the portal (React components, potentially a separate route structure like `/supplier/:token`).
    *   **Action:** Implement UI for viewing PO details (read-only).
    *   **Action:** Implement "Accept" / "Reject" buttons.
    *   **Action:** Create backend endpoints (Supabase Edge Functions) triggered by Accept/Reject actions to update the PO status in the `purchase_orders` table. Notify the app user.
    *   **Action:** Implement UI for invoice upload (file input).
    *   **Action:** Create backend endpoint (Edge Function) for handling invoice file uploads (save to Supabase Storage, link to the PO). Update PO status to `InvoiceUploaded`. Notify the app user (admin).
6.  **Implement Invoice Approval Workflow:**
    *   **Task:** Create an interface for the app admin/user to review and approve uploaded invoices.
    *   **Action:** Add a section/page in the main app (e.g., linked from `PODetail` or a dedicated "Approvals" page) showing POs with status `InvoiceUploaded`.
    *   **Action:** Display the uploaded invoice details (and maybe a preview/link to the file).
    *   **Action:** Add "Approve" / "Reject Invoice" buttons.
    *   **Action:** Create backend endpoints (Edge Functions) triggered by these buttons:
        *   **Approve:** Update PO status to `InvoiceApproved`. Trigger the Bill Creation process (see next point).
        *   **Reject:** Update PO status (e.g., back to `AcceptedBySupplier` or a new `InvoiceRejected` status). Notify the supplier (optional).
7.  **Implement Correct Bill Creation Workflow:**
    *   **Task:** Create the FreeAgent Bill *after* invoice approval.
    *   **Action:** Create a new Supabase Edge Function (`create-bill-from-invoice`).
    *   **Action:** Trigger this function when an admin approves an invoice.
    *   **Action:** This function should:
        *   Fetch the relevant PO details and the *approved* invoice data (amount, potentially line items if they differ from PO).
        *   Fetch the uploaded invoice file from Supabase Storage.
        *   Call the FreeAgent API (`POST /v2/bills`) using the approved invoice data.
        *   Attach the invoice file to the created Bill (`POST /v2/bills/{bill_id}/attachments`).
        *   Update the PO record in Supabase: set status to `BilledInFreeAgent` and store the `freeagent_bill_id`.
8.  **Implement Dashboard Logic:**
    *   **Task:** Populate the dashboard with real data and calculate profit margins.
    *   **Action:** Define "Invoicing Amount": Is it the draft invoice amount entered during project creation, or the sum of actual `Sent`/`Paid` invoices in FreeAgent for that project? Clarify this requirement.
    *   **Action:** Fetch Projects (likely from `cached_projects`).
    *   **Action:** For each project:
        *   Fetch associated POs from Supabase (`purchase_orders` table filtering by `freeagent_project_url`). Sum their `amount` (or maybe sum the `total_value` of the corresponding *approved* `Bills` in FreeAgent for actual cost?).
        *   Fetch the "Invoicing Amount" based on the clarified definition (either from the initial project data or by querying FreeAgent invoices linked to the project).
        *   Calculate and display the profit margin.
    *   **Action:** Update `Dashboard.tsx` to use fetched data instead of mock stats. Consider using React Query for data fetching.

**II. FreeAgent Integration & Syncing Enhancements:**

9.  **Refine Category Fetching/Usage:**
    *   **Task:** The `sync-freeagent-data` function fetches *all* category types. The `po-form.tsx` likely only needs *expense* categories (Admin Expenses, Cost of Sales).
    *   **Action:** Modify `sync-freeagent-data` to potentially only fetch relevant expense categories, or add filtering logic in `po-form.tsx`'s query if keeping all cached categories is desired.
10. **Implement Ongoing/Webhook Sync:**
    *   **Task:** Data can change directly in FreeAgent. The current sync is manual.
    *   **Action:** Consider implementing periodic background sync (e.g., using Supabase scheduled functions) or explore FreeAgent webhooks (if available and suitable) to keep `cached_contacts`, `cached_projects`, etc., up-to-date automatically.
11. **Sync Bills/Invoices for Dashboard:**
    *   **Task:** Depending on the "Invoicing Amount" definition, you might need to sync Invoice or Bill data from FreeAgent.
    *   **Action:** Add logic to `sync-freeagent-data` (or a separate function) to fetch relevant Invoices/Bills and store key details (e.g., amount, status, project link) in new Supabase tables (`cached_invoices`, `cached_bills`) if needed for the dashboard calculation.

**III. UI/UX & Frontend Polish:**

12. **Improve Error Handling & User Feedback:**
    *   **Task:** Ensure robust error handling for all API calls (Supabase, FreeAgent) and user actions.
    *   **Action:** Provide clear user feedback (using `sonner` or `useToast`) for successes and failures (e.g., PO creation, sync errors, connection issues). Display specific error messages where helpful.
13. **Loading States:**
    *   **Task:** Ensure loading indicators (`Loader2`, `Skeleton`) are used consistently during data fetching or mutations in all components (`POList`, `PODetail`, `POForm`, `Dashboard`, `Settings`).
14. **Dashboard Visualizations:**
    *   **Task:** Enhance the dashboard beyond basic stats.
    *   **Action:** Consider using the `Chart` component (`@/components/ui/chart.tsx` based on Recharts) to visualize project profitability, PO spending over time, etc.
15. **Search & Filtering:**
    *   **Task:** Implement the search functionality hinted at in `POList.tsx`.
    *   **Action:** Add filtering options (e.g., by status, date range, project) to `POList.tsx`.
16. **Notifications:**
    *   **Task:** Implement in-app or email notifications for key events.
    *   **Action:** Notify users when a supplier accepts/rejects a PO, uploads an invoice, or when an invoice needs approval.

**IV. Backend & Security:**

17. **Secure Disconnect Functionality:**
    *   **Task:** The current `disconnect` function in `freeagent-api.ts` deletes credentials directly from the client-side, relying heavily on RLS.
    *   **Action:** **Strongly recommend** moving the credential deletion logic to a dedicated Supabase Edge Function (`disconnect-freeagent`?). This function should verify the user's authorization *server-side* before deleting the credentials associated with their company.
18. **Refine Database Schema:**
    *   **Task:** Review and potentially refine the database schema based on the implemented workflows.
    *   **Action:** Add necessary tables (e.g., `uploaded_invoices`). Ensure foreign keys, indexes, and constraints (like `NOT NULL`) are correctly set up. Add the detailed `status` enum to `purchase_orders`. Consider if `amount` on `purchase_orders` should store the *initial* PO amount or the *final billed* amount.
19. **Row Level Security (RLS):**
    *   **Task:** Implement or verify comprehensive RLS policies on all relevant Supabase tables (`purchase_orders`, `po_lines`, `cached_contacts`, `cached_projects`, `cached_categories`, `company_details`, `freeagent_credentials`, etc.).
    *   **Action:** Ensure users can only access data belonging to their own company (`company_id` checks). Define policies for different roles if needed (e.g., admin vs. project manager). Ensure credentials can only be accessed/modified appropriately (ideally only by secure backend functions).

**V. Quality & Maintenance:**

20. **Testing:**
    *   **Task:** Add tests (unit, integration, potentially e2e).
    *   **Action:** Write tests for key components, utility functions (`currency`, `email-service`), and especially the Edge Functions.
21. **Code Cleanup & Refinement:**
    *   **Task:** Refactor code for clarity, consistency, and maintainability.
    *   **Action:** Remove unused code/components. Ensure consistent error handling patterns. Address any `console.log` statements left over from debugging. Ensure TypeScript types are used effectively.

This list covers the major gaps and necessary refinements based on your description and the provided code. The highest priority should be fixing the core workflow issues (Bill creation timing, implementing Project creation, Supplier portal/invoice flow, Dashboard logic) and addressing the security concern with the disconnect function.