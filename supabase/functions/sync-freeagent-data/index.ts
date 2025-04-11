/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient, PostgrestResponse, PostgrestSingleResponse, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getFreeAgentClient, FreeAgentClient } from "../_shared/freeagent.ts"; // Import the shared helper

// --- Interfaces (match FreeAgent API responses) ---
interface Contact {
  url: string;
  organisation_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  billing_email?: string;
  is_supplier?: boolean;
  is_customer?: boolean;
  // Add other relevant fields if needed
}

interface Project {
    url: string;
    name: string;
    status: string;
    budget_units?: string | null;
    is_ir35?: boolean;
    contact?: string; // URL of the contact
    // Add other relevant fields
}

interface Category {
    url: string;
    nominal_code: string;
    description: string;
    category_type?: string; // Add optional category type
    allowable_for_tax?: boolean;
    // Add other relevant fields
}

interface CompanyInfo {
    url: string;
    name: string;
    currency: string;
    company_type?: string;
    address1?: string;
    address2?: string;
    address3?: string;
    town?: string;
    region?: string;
    postcode?: string;
    country?: string;
    company_registration_number?: string;
    sales_tax_registration_number?: string;
    // Add other relevant fields
}

// Define a type for the combined category response
interface AllCategoriesResponse {
    admin_expenses_categories?: Category[];
    cost_of_sales_categories?: Category[];
    income_categories?: Category[];
    general_categories?: Category[];
    // Add other potential category types if needed
}

// --- Helper to get Company ID ---
async function getCompanyIdForUser(supabaseAdmin: SupabaseClient, userId: string): Promise<string> {
    const { data, error } = await supabaseAdmin
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .single();

    if (error || !data?.company_id) {
        console.error(`Sync Error: Fetching company ID for user ${userId}:`, error);
        throw new Error('User is not associated with a company or database error occurred.');
    }
    return data.company_id;
}

// --- Helper for Paginated Fetching ---
async function fetchPaginatedData<T>(
    faClient: FreeAgentClient,
    endpoint: string,
    dataKey: string // e.g., 'contacts', 'projects'
): Promise<T[]> {
    const allData: T[] = [];
    let page = 1;
    const perPage = 100; // Max allowed by FreeAgent

    try {
        while (true) {
            const paginatedEndpoint = `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&per_page=${perPage}`;
            console.log(`Fetching page ${page} from ${paginatedEndpoint}...`);
            const response = await faClient.get(paginatedEndpoint);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`FreeAgent API error fetching ${endpoint} page ${page}: ${response.status} ${errorText}`);
                // Decide if partial data is acceptable or throw
                throw new Error(`Failed to fetch ${dataKey} from FreeAgent: ${response.status}`);
            }

            const jsonData = await response.json();

            // Handle potential variations in response structure
            let data: T[] | undefined;
            if (jsonData && typeof jsonData === 'object' && dataKey in jsonData) {
                data = jsonData[dataKey] as T[];
            } else {
                // Sometimes the root object is the array (e.g., /categories/)
                 if (Array.isArray(jsonData)) {
                     data = jsonData as T[];
                 } else {
                     console.warn(`Unexpected response structure for ${dataKey} at ${endpoint}:`, jsonData);
                     data = [];
                 }
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log(`No more data found for ${dataKey} on page ${page}.`);
                break; // No more data
            }

            allData.push(...data);
            console.log(`Fetched ${data.length} ${dataKey} on page ${page}. Total: ${allData.length}`);

            if (data.length < perPage) {
                break; // Last page
            }
            page++;
        }
        console.log(`Finished paginated fetch. Total ${allData.length} ${dataKey}.`);
        return allData;
    } catch (error) {
        console.error(`Error during paginated fetch for ${endpoint}:`, error);
        throw error; // Re-throw to be caught by the main handler
    }
}

// --- Main Sync Function Logic ---
serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    let supabaseAdmin: SupabaseClient | null = null;
    let companyId: string | null = null;

    try {
        // 1. Create Supabase Admin Client
        supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 2. Verify JWT and get User/Company ID
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing authorization header");

        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
            authHeader.replace("Bearer ", "")
        );
        if (userError || !user) throw new Error(`Authentication failed: ${userError?.message || 'Invalid token'}`);
        console.log("Sync initiated by user:", user.id);

        companyId = await getCompanyIdForUser(supabaseAdmin, user.id);
        console.log("Sync target company ID:", companyId);

        // 3. Get FreeAgent Client (handles creds & refresh)
        const faClient = await getFreeAgentClient(supabaseAdmin, companyId);
        if (!faClient) {
            throw new Error("FreeAgent connection not found, invalid, or token refresh failed.");
        }

        // 4. Fetch Data from FreeAgent
        console.log("Starting FreeAgent data fetch...");
        const syncTimestamp = new Date().toISOString();
        let contacts: Contact[] = [];
        let projects: Project[] = [];
        let categories: Category[] = []; // Combined list
        let companyInfo: CompanyInfo | null = null;
        let allCategoriesResponse: AllCategoriesResponse | null = null; // Store the raw category response

        // Use Promise.allSettled for concurrent fetching
        const fetchResults = await Promise.allSettled([
            faClient.get('/v2/company'),
            fetchPaginatedData<Contact>(faClient, '/v2/contacts', 'contacts'), // Key 'contacts' is used internally by fetchPaginatedData
            fetchPaginatedData<Project>(faClient, '/v2/projects?status=Active', 'projects'), // Key 'projects'
            // Single call for all categories - NOTE: fetchPaginatedData might need adjustment if /v2/categories is NOT paginated
            // For now, assume it might be paginated or returns all in one go. We pass a dummy key 'categories'
            // If it's not paginated, fetchPaginatedData will likely just make one call.
            faClient.get('/v2/categories') // Direct call, handle response below
        ]);

        // Process fetch results
        const errorsFetching: { source: string, reason: any }[] = []; 

        // Company Info
        if (fetchResults[0].status === 'fulfilled') {
            const companyResponse = fetchResults[0].value;
            if (companyResponse.ok) {
                try {
                  companyInfo = (await companyResponse.json()).company as CompanyInfo;
                } catch (e) { errorsFetching.push({ source: 'Company Info Parse', reason: e instanceof Error ? e.message : String(e) }); }
            }
            else errorsFetching.push({ source: 'Company Info Fetch', reason: `Status ${companyResponse.status}: ${await companyResponse.text()}`});
        } else errorsFetching.push({ source: 'Company Info', reason: (fetchResults[0] as PromiseRejectedResult).reason });

        // Contacts
        if (fetchResults[1].status === 'fulfilled') {
             contacts = fetchResults[1].value; // fetchPaginatedData returns the array directly
        } else errorsFetching.push({ source: 'Contacts', reason: (fetchResults[1] as PromiseRejectedResult).reason });

        // Projects
        if (fetchResults[2].status === 'fulfilled') {
             projects = fetchResults[2].value; // fetchPaginatedData returns the array directly
        } else errorsFetching.push({ source: 'Projects', reason: (fetchResults[2] as PromiseRejectedResult).reason }); 

        // Categories (handle direct response)
        if (fetchResults[3].status === 'fulfilled') {
            const categoriesResponse = fetchResults[3].value;
            if (categoriesResponse.ok) {
                try {
                    allCategoriesResponse = await categoriesResponse.json() as AllCategoriesResponse;
                    // Combine categories from the response object
                    if (allCategoriesResponse?.admin_expenses_categories) {
                        categories.push(...allCategoriesResponse.admin_expenses_categories.map(c => ({ ...c, category_type: 'Admin Expense' })));
                    }
                    if (allCategoriesResponse?.cost_of_sales_categories) {
                        categories.push(...allCategoriesResponse.cost_of_sales_categories.map(c => ({ ...c, category_type: 'Cost of Sales' })));
                    }
                    // Add other category types if needed (e.g., income_categories, general_categories)
                    console.log(`Successfully processed ${categories.length} categories.`);
                } catch (e) { errorsFetching.push({ source: 'Categories Parse', reason: e instanceof Error ? e.message : String(e) }); }
            } else {
                 errorsFetching.push({ source: 'Categories Fetch', reason: `Status ${categoriesResponse.status}: ${await categoriesResponse.text()}`});
            }
        } else errorsFetching.push({ source: 'Categories', reason: (fetchResults[3] as PromiseRejectedResult).reason });

        if (errorsFetching.length > 0) {
           console.error("Errors encountered during FreeAgent fetch:", JSON.stringify(errorsFetching));
           // Decide if we proceed with partial data or throw an error
        }
        console.log(`Data Fetched - Company: ${!!companyInfo}, Contacts: ${contacts.length}, Projects: ${projects.length}, Categories: ${categories.length}`);

        // 5. Upsert Data into Supabase
        console.log("Starting Supabase upsert...");
        const upsertPromises: Promise<PostgrestResponse<any> | PostgrestSingleResponse<any>>[] = [];

        // --- Upsert Company Info (Update existing 'companies' table) ---
        if (companyInfo) {
            upsertPromises.push(
                supabaseAdmin
                    .from('companies')
                    .update({
                        fa_company_url: companyInfo.url,
                        fa_company_name: companyInfo.name,
                        fa_default_currency: companyInfo.currency,
                        // Keep other 'companies' fields as they are unless needed
                        // last_synced_at: syncTimestamp // Maybe update this too?
                    })
                    .eq('id', companyId)
            );

            // --- Upsert into NEW 'company_details' table ---
            const addressParts = [
                companyInfo.address1,
                companyInfo.address2,
                companyInfo.address3,
                companyInfo.town,
                companyInfo.region,
                companyInfo.postcode,
                companyInfo.country,
            ].filter(Boolean); // Filter out null/undefined/empty parts
            const fullAddress = addressParts.join('\n'); // Join with newlines

            const companyDetailsRecord = {
                company_id: companyId, // Primary key linking to companies
                name: companyInfo.name,
                address: fullAddress || null, // Store formatted address or null
                registration_number: companyInfo.company_registration_number || null,
                sales_tax_registration_number: companyInfo.sales_tax_registration_number || null,
                last_synced_at: syncTimestamp,
            };

            upsertPromises.push(
                 supabaseAdmin
                     .from('company_details')
                     .upsert(companyDetailsRecord, { onConflict: 'company_id' })
            );
        }

        // --- Upsert Contacts ---
        if (contacts.length > 0) {
            const contactData = contacts.map(c => ({
                company_id: companyId!, // Assert non-null as we checked earlier
                freeagent_url: c.url,
                name: c.organisation_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Contact',
                first_name: c.first_name,
                last_name: c.last_name,
                email: c.email,
                billing_email: c.billing_email,
                is_supplier: c.is_supplier ?? false,
                is_customer: c.is_customer ?? false,
                raw_data: c,
                synced_at: syncTimestamp,
            }));
            upsertPromises.push(
                 supabaseAdmin.from('cached_contacts').upsert(contactData, { onConflict: 'freeagent_url' })
            );
        }

        // --- Upsert Projects ---
        if (projects.length > 0) {
            const projectData = projects.map(p => ({
                company_id: companyId!,
                freeagent_url: p.url,
                name: p.name,
                status: p.status,
                budget_units: typeof p.budget_units === 'number' ? p.budget_units : null,
                is_ir35: p.is_ir35,
                freeagent_contact_url: p.contact,
                raw_data: p,
                synced_at: syncTimestamp,
            }));
            upsertPromises.push(
                 supabaseAdmin.from('cached_projects').upsert(projectData, { onConflict: 'freeagent_url' })
            );
        }

        // --- Upsert Categories ---
        if (categories.length > 0) {
            const categoryData = categories.map(cat => ({
                company_id: companyId!,
                freeagent_url: cat.url,
                nominal_code: cat.nominal_code,
                description: cat.description,
                category_type: cat.category_type, // Added during fetch
                allowable_for_tax: cat.allowable_for_tax,
                raw_data: cat,
                synced_at: syncTimestamp,
            }));
            upsertPromises.push(
                 supabaseAdmin.from('cached_categories').upsert(categoryData, { onConflict: 'freeagent_url' })
            );
        }

        // 6. Execute all Upserts Concurrently
        console.log(`Executing ${upsertPromises.length} upsert operations...`);
        const results = await Promise.allSettled(upsertPromises);

        // 7. Process Upsert Results & Update Credentials Timestamp
        const upsertErrors: { source: string; reason: PostgrestError | any }[] = [];

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                // Handle network errors or other promise rejections
                upsertErrors.push({ source: `Promise rejection (Op ${index})`, reason: result.reason });
            } else { // status === 'fulfilled'
                // result.value is PostgrestResponse<any> | PostgrestSingleResponse<any>
                // Directly check the error property on the fulfilled result's value
                if (result.value.error) { 
                    upsertErrors.push({ source: `Supabase Upsert (Op ${index})`, reason: result.value.error });
                }
            }
        });

        if (upsertErrors.length > 0) {
             console.error("Supabase upsert errors:", JSON.stringify(upsertErrors));
             const errorMessages = upsertErrors.map(e => `${e.source}: ${e.reason?.message || JSON.stringify(e.reason)}`).join('; ');
             throw new Error(`Database Error: Failed to save some synced data. Errors: ${errorMessages}`);
        }

        console.log("Supabase upsert successful.");

        // 8. Return Success
        return new Response(JSON.stringify({
             message: "Sync successful",
             syncedContacts: contacts.length,
             syncedProjects: projects.length,
             syncedCategories: categories.length,
             updatedCompanyInfo: !!companyInfo,
         }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: unknown) { // Explicitly type error as unknown
        console.error("Error in sync-freeagent-data function:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error during sync";
        const statusCode = errorMessage.includes("Authentication failed") || errorMessage.includes("not found") || errorMessage.includes("company ID") ? 401 : 500;

        return new Response(JSON.stringify({ error: errorMessage }), {
            status: statusCode,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
}); 