Context & Rules for Cursor AI Assistant: Purchase Order Tool

1. Project Overview

Goal: Build a simple Purchase Order (PO) tool.

Primary Integration: FreeAgent (Financial Accounting Software). API Docs: https://dev.freeagent.com/docs

Database: Supabase (PostgreSQLaaS with APIs). API Docs: https://supabase.com/docs/guides/api

Target AI: Cursor (Provide context for code generation, explanation, and debugging).

(Optional) Tech Stack: [Specify your frontend/backend if known, e.g., React, Next.js, Python/Flask, Node.js/Express, etc.]

2. Core Entities & Data Sources

Users: Stored in Supabase Auth.

Purchase Orders (POs): Created by users in this app. Details stored in Supabase. Corresponding 'Bill' created in FreeAgent.

Projects: Primarily sourced from FreeAgent API. Key data (ID, name, status) may be cached/referenced in Supabase.

Contacts: Primarily sourced from FreeAgent API. May be cached in Supabase for performance (e.g., dropdowns).

Bills (FreeAgent): Represent the financial liability created in FreeAgent corresponding to a PO from this app.

3. User Roles & Permissions

Authentication: Handled via Supabase Auth.

Roles:

Admin: [Define specific permissions if different from Project Manager, e.g., User Management, Settings. If same for now, state that.]

Project Manager: [Define specific permissions. Based on your draft, seems like they can view main page and create POs.]

Current Assumption: Both Admin and Project Manager can perform all described functions (View Main Page, Create New PO). Specify if this changes.

4. Database Schema (Supabase - Conceptual)

users: Standard Supabase auth users table.

purchase_orders:

id (Primary Key)

po_number (Text, User input)

freeagent_bill_id (Integer/Text, ID of the corresponding Bill created in FreeAgent)

freeagent_project_id (Integer, Foreign Key referencing the associated FreeAgent Project)

freeagent_contact_id (Integer, Foreign Key referencing the FreeAgent Contact)

currency (Text)

delivery_date (Date/Timestamp)

notes (Text)

created_at (Timestamp)

created_by (UUID, Foreign Key to users)

total_amount (Numeric, calculated from lines)

status (Text, e.g., 'Draft', 'Sent', 'Reconciled' - potentially synced from FreeAgent Bill status)

po_lines:

id (Primary Key)

po_id (Foreign Key to purchase_orders)

description (Text)

quantity (Numeric)

unit_price (Numeric)

vat_rate (Numeric, e.g., 0.20 for 20%)

line_total (Numeric, calculated)

cached_contacts (Optional, for performance):

freeagent_contact_id (Primary Key)

name (Text)

last_refreshed (Timestamp)

Note: Relationships like purchase_orders to freeagent_project_id imply we need a way to associate a PO with a FreeAgent project during creation or afterwards.

5. FreeAgent API Interaction

Authentication: [Specify method if known, likely OAuth2]

Key Endpoints (Likely needed):

GET /projects: To fetch active projects (filter by status=Active). Need name, contact (ID), potentially budget or related fields.

GET /contacts: To fetch all contacts for selection and potentially caching.

GET /invoices: To fetch invoice details related to a project (project_id filter). Need gross_value (invoiced amount) and status (draft/sent). Sum these per project.

POST /bills: To create a bill when a PO is generated in our app. Needs contact, dated_on, currency, bill_items (description, price, quantity, tax).

GET /bills: To check the reconciliation status of bills corresponding to our POs. A bill's status might indicate if it's paid/reconciled.

6. Feature Specifications

Main Page:

Access: Admin, Project Manager.

Section 1: Active Purchase Orders:

Definition: POs stored in Supabase whose corresponding FreeAgent Bill is not reconciled/paid (requires checking Bill status via API).

Data Displayed: PO Number, Contact Name, Total Amount, Date, Status.

Source: Primarily purchase_orders table in Supabase, cross-referenced with FreeAgent Bill status.

Section 2: Active Projects:

Definition: Projects with status=Active in FreeAgent.

Data Displayed per Project:

Project Name (from FA Project)

Contact Name (from FA Contact associated with FA Project)

Total Invoiced Amount (Sum of gross_value from relevant FA Invoices for this project)

Invoice Status Summary (e.g., "Mix of Draft/Sent", "All Sent", "None Sent" - derived from FA Invoice statuses)

Total Purchase Order Amount (Sum of total_amount from Supabase purchase_orders linked to this freeagent_project_id)

Profit Margin (Total Invoiced Amount - Total Purchase Order Amount)

Source: Primarily FreeAgent API calls (Projects, Invoices, Contacts), aggregated with data from Supabase purchase_orders.

New Purchase Order Page:

Access: Admin, Project Manager.

Workflow:

Load Contacts: Fetch all contacts from FreeAgent API on page load. Populate a selection dropdown. (Consider caching in cached_contacts table for better UX, but ensure data freshness).

User Input:

Select Contact (from FA list).

Enter PO Number (string).

Select Currency (string, e.g., 'GBP', 'USD').

Select Delivery Date (date).

Enter Notes (text).

Add Line Items: Table/dynamic form for Description (text), Quantity (number), Unit Price (number), VAT Rate (number, e.g., 20 for 20%). Calculate line totals and overall total dynamically.

(Implicit Requirement): Select associated FreeAgent Project. This needs to be added to the UI. How is this selected? Dropdown populated by active FA projects?

Action: "Create Purchase Order" Button:

Validate inputs.

API Call: Create a Bill in FreeAgent using the POST /bills endpoint with contact, date, currency, and line item details.

DB Write: On successful Bill creation:

Save the PO details (PO number, selected project ID, contact ID, currency, date, notes, total amount, creator user ID) into the Supabase purchase_orders table.

Save the line items into the Supabase po_lines table.

Store the returned freeagent_bill_id in the purchase_orders record.

User Feedback: Show success message.

Offer Outputs: Provide buttons/links to "Email PO" (requires email service integration?) and "Download PO as PDF" (requires PDF generation library).

Navigation: If the user navigates back to the Main Page, the data there should reflect the newly added PO cost for the relevant project (implies data re-fetch on Main Page load or navigation).

7. General Rules & Assumptions

Error Handling: Implement robust error handling for API calls (FreeAgent, Supabase) and user input validation.

UI/UX: Assume standard web application patterns unless specified. Responsiveness is desirable.

Security: Use Supabase Row Level Security (RLS) to ensure users can only access/modify data according to their roles and ownership. API keys/secrets for FreeAgent must be stored securely (e.g., environment variables).

Data Consistency: Be mindful of potential synchronization issues between FreeAgent and Supabase. Decide on the source of truth for different data points (e.g., Project status is from FA, PO details primarily from Supabase once created).