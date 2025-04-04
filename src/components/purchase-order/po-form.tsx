import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Combobox, ComboboxOption } from '@/components/ui/combo-box';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, AlertCircle } from 'lucide-react';
import { PurchaseOrder, POLineItem } from '@/types/purchase-order';
import { formatCurrency } from '@/utils/currency';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database } from '@/integrations/supabase/types';

// --- Type Aliases for Supabase Tables (using generated types) ---
type CachedContact = Database['public']['Tables']['cached_contacts']['Row'];
type CachedProject = Database['public']['Tables']['cached_projects']['Row'];
type CachedCategory = Database['public']['Tables']['cached_categories']['Row'];

// --- Zod Schema Definition ---
const poLineItemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(0.01, "Quantity must be positive"),
    unit_price: z.number().min(0, "Unit price cannot be negative"),
    category_url: z.string().optional().nullable(), // Storing FreeAgent URL for category
});

const purchaseOrderSchema = z.object({
    id: z.string().optional(),
    po_number: z.string().min(1, "PO Number is required"),
    supplier_url: z.string().min(1, "Supplier is required"), // Storing FreeAgent contact URL
    issue_date: z.date({ required_error: "Issue date is required" }),
    delivery_date: z.date().optional().nullable(),
    currency: z.string().length(3, "Currency must be 3 letters").toUpperCase(),
    project_url: z.string().optional().nullable(), // Store FreeAgent project URL
    notes: z.string().optional().nullable(),
    line_items: z.array(poLineItemSchema).min(1, "At least one line item is required"),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

// --- POForm Component ---
interface POFormProps {
    initialData?: PurchaseOrder | null; // Use PurchaseOrder type from generated file
}

export const POForm: React.FC<POFormProps> = ({ initialData }) => {
    const navigate = useNavigate();
    const { companyId: poIdParam } = useParams<{ companyId: string }>(); // Use a distinct name from companyId state
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const companyId = user?.company?.id;
    // Use fa_default_currency from company context, fallback to GBP
    const defaultCurrency = user?.company?.fa_default_currency || "GBP";
    const isNew = !initialData;

    // --- React Hook Form Setup ---
    const form = useForm<PurchaseOrderFormData>({
        resolver: zodResolver(purchaseOrderSchema),
        defaultValues: {
            po_number: initialData?.po_number || "",
            supplier_url: initialData?.supplier_url || "",
            issue_date: initialData?.issue_date ? new Date(initialData.issue_date) : new Date(),
            delivery_date: initialData?.delivery_date ? new Date(initialData.delivery_date) : null,
            currency: initialData?.currency || defaultCurrency,
            project_url: initialData?.project_url || null,
            notes: initialData?.notes || "",
            line_items: initialData?.line_items?.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                category_url: item.fa_category_url, // Map db field to form field
            })) || [
                { description: "", quantity: 1, unit_price: 0, category_url: null }, // Start with one empty line
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "line_items",
    });

    // --- Data Fetching with React Query ---

    // Fetch All Contacts for Supplier Dropdown
    const { data: contactOptions, isLoading: isLoadingContacts, error: contactError } = useQuery<
        ComboboxOption[], Error // Add Error type
    >({
        queryKey: ['cachedContacts', companyId, 'all'], // Changed key to reflect all contacts
        queryFn: async (): Promise<ComboboxOption[]> => {
            if (!companyId) return []; // Return empty array if no companyId
            const { data, error } = await supabase
                .from('cached_contacts') 
                .select('freeagent_url, name')
                .eq('company_id', companyId)
                // .eq('is_supplier', true) // REMOVED filter
                .order('name', { ascending: true });

            if (error) {
                console.error("Error fetching contacts from cache:", error);
                throw new Error(`Failed to load contacts: ${error.message}`);
            }
            // Map the result to ComboboxOption
            return (data as CachedContact[] | null)?.map(c => ({ value: c.freeagent_url, label: c.name ?? 'Unnamed' })) ?? [];
        },
        enabled: !!companyId,
        staleTime: 10 * 60 * 1000,
    });

    // Fetch Projects from Cached Projects
    const { data: projectOptions, isLoading: isLoadingProjects, error: projectError } = useQuery<
         ComboboxOption[], Error
     >({
         queryKey: ['cachedProjects', companyId],
         queryFn: async (): Promise<ComboboxOption[]> => {
             if (!companyId) return [];
             const { data, error } = await supabase
                 .from('cached_projects')
                 .select('freeagent_url, name, status')
                 .eq('company_id', companyId)
                 .order('name', { ascending: true });
 
             if (error) {
                 console.error("Error fetching projects from cache:", error);
                 throw new Error(`Failed to load projects: ${error.message}`);
             }
             return (data as CachedProject[] | null)?.map(p => ({ value: p.freeagent_url, label: p.name ?? 'Unnamed' })) ?? [];
         },
         enabled: !!companyId,
         staleTime: 10 * 60 * 1000,
     });

    // Fetch Categories from Cached Categories
    const { data: categoryOptions, isLoading: isLoadingCategories, error: categoryError } = useQuery<
         ComboboxOption[], Error
     >({
         queryKey: ['cachedCategories', companyId],
         queryFn: async (): Promise<ComboboxOption[]> => {
             if (!companyId) return [];
             const { data, error } = await supabase
                 .from('cached_categories')
                 .select('freeagent_url, description, nominal_code')
                 .eq('company_id', companyId)
                 .order('description', { ascending: true });
 
             if (error) {
                 console.error("Error fetching categories from cache:", error);
                 throw new Error(`Failed to load categories: ${error.message}`);
             }
             return (data as CachedCategory[] | null)?.map(c => ({
                 value: c.freeagent_url,
                 label: `${c.description ?? 'Unnamed'} (${c.nominal_code ?? 'N/A'})`
             })) ?? [];
         },
         enabled: !!companyId,
         staleTime: 10 * 60 * 1000,
     });

    // --- Form Submission Logic ---
    const mutation = useMutation<any, Error, PurchaseOrderFormData>({ // Add explicit types
        mutationFn: async (formData: PurchaseOrderFormData) => {
            if (!companyId || !user?.id) {
                 throw new Error("User or company information is missing.");
            }
            const functionName = 'create-purchase-order';
            const payload = {
                ...formData,
                companyId: companyId,
                userId: user.id,
                issue_date: formData.issue_date.toISOString(),
                delivery_date: formData.delivery_date ? formData.delivery_date.toISOString() : null,
                existingPoId: isNew ? undefined : poIdParam,
                // Map line item category_url back to fa_category_url for the function if needed
                line_items: formData.line_items.map(item => ({ 
                    ...item, 
                    fa_category_url: item.category_url 
                }))
            };
            console.log("Invoking Edge Function with payload:", payload);
            const { data, error } = await supabase.functions.invoke(functionName, { body: payload });

            if (error) {
                console.error("Edge function invocation error:", error);
                throw new Error(error.message || `Failed to ${isNew ? 'create' : 'update'} purchase order.`);
            }
            if (data?.error) {
                console.error("Edge function execution error:", data.error);
                throw new Error(data.error);
            }
            console.log("Edge function success data:", data);
            return data;
        },
        onSuccess: (data) => {
            const successMessage = isNew ? "Purchase Order created!" : "Purchase Order updated!";
            toast(successMessage);
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            
            const returnedPoId = data?.purchaseOrder?.id ?? poIdParam;
            const companySlug = user?.company?.slug; // Get company slug from auth context
            
            // Construct the correct path including the company slug
            const redirectPath = companySlug && returnedPoId 
                ? `/company/${companySlug}/purchase-orders/${returnedPoId}` 
                : companySlug 
                    ? `/company/${companySlug}/purchase-orders` // Fallback to list if ID missing
                    : '/settings'; // Fallback to settings if slug missing
            
            queryClient.invalidateQueries({ queryKey: ['purchaseOrder', returnedPoId] });
            navigate(redirectPath); // Use the constructed path
        },
        onError: (error) => {
            toast("Error Saving PO", {
                description: error.message,
            });
        },
    });

    const onSubmit = (data: PurchaseOrderFormData) => {
        mutation.mutate(data);
    };

    // --- Helper Functions ---
    const addNewLineItem = () => {
        append({ description: "", quantity: 1, unit_price: 0, category_url: null });
    };

    const removeLineItem = (index: number) => {
         if (fields.length <= 1) {
             toast("Cannot Remove", { description: "Must have at least one line item." });
             return;
         }
        remove(index);
    };

    // Calculate total
    const calculateTotal = useCallback(() => {
        const items = form.getValues("line_items");
        return items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
    }, [form]);

    const [total, setTotal] = useState(() => calculateTotal());

    useEffect(() => {
        setTotal(calculateTotal()); // Recalculate on initial render/data load
        const subscription = form.watch((_value, { name }) => {
            if (name?.startsWith("line_items")) {
                setTotal(calculateTotal());
            }
        });
        return () => subscription.unsubscribe();
    }, [form, calculateTotal, fields]); // Watch fields array too

    // --- Render Logic ---
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{isNew ? 'Create New Purchase Order' : 'Edit Purchase Order'}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="po_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>PO Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter PO Number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="supplier_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier</FormLabel>
                                    <FormControl>
                                        <Combobox
                                            options={contactOptions || []}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder={isLoadingContacts ? "Loading..." : "Select supplier..."}
                                            searchPlaceholder="Search suppliers..."
                                            notFoundMessage="No suppliers found. Sync in Settings?"
                                            isLoading={isLoadingContacts}
                                            disabled={isLoadingContacts || mutation.isPending}
                                        />
                                    </FormControl>
                                    {contactError && (
                                        <Alert variant="destructive" className="mt-1 text-xs">
                                            <AlertCircle className="h-3 w-3 mr-1 inline" />
                                            <AlertDescription className="inline">{contactError.message}</AlertDescription>
                                        </Alert>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="issue_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col pt-2">
                                    <FormLabel>Issue Date</FormLabel>
                                    <FormControl>
                                        <DatePicker field={field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="delivery_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col pt-2">
                                    <FormLabel>Delivery Date (Optional)</FormLabel>
                                    <FormControl>
                                        <DatePicker 
                                            field={field} 
                                            nullable={true} 
                                            placeholder="Optional Delivery Date"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Currency</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., GBP" {...field} maxLength={3} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="project_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project (Optional)</FormLabel>
                                    <FormControl>
                                        <Combobox
                                            options={projectOptions ?? []}
                                            value={field.value ?? ''}
                                            onChange={field.onChange}
                                            placeholder={isLoadingProjects ? "Loading..." : "Select project..."}
                                            searchPlaceholder="Search projects..."
                                            notFoundMessage="No projects found. Sync in Settings?"
                                            isLoading={isLoadingProjects}
                                            disabled={isLoadingProjects || mutation.isPending}
                                            allowClear={true}
                                        />
                                    </FormControl>
                                    {projectError && (
                                        <Alert variant="destructive" className="mt-1 text-xs">
                                            <AlertCircle className="h-3 w-3 mr-1 inline" />
                                            <AlertDescription className="inline">{projectError.message}</AlertDescription>
                                        </Alert>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Line Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Description</TableHead>
                                    <TableHead className="w-[15%]">Quantity</TableHead>
                                    <TableHead className="w-[15%]">Unit Price</TableHead>
                                    <TableHead className="w-[20%]">Category (Optional)</TableHead>
                                    <TableHead className="w-[10%] text-right">Total</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                    const quantity = form.watch(`line_items.${index}.quantity`);
                                    const unitPrice = form.watch(`line_items.${index}.unit_price`);
                                    const lineTotal = (quantity || 0) * (unitPrice || 0);
                                    
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`line_items.${index}.description`}
                                                    render={({ field }) => (
                                                        <Input placeholder="Item description" {...field} />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`line_items.${index}.quantity`}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            placeholder="1"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                            step="any"
                                                        />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`line_items.${index}.unit_price`}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                            step="any"
                                                        />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`line_items.${index}.category_url`}
                                                    render={({ field }) => (
                                                        <Combobox
                                                            options={categoryOptions ?? []}
                                                            value={field.value ?? ''}
                                                            onChange={field.onChange}
                                                            placeholder={isLoadingCategories ? "Loading..." : "Select category..."}
                                                            searchPlaceholder="Search categories..."
                                                            notFoundMessage="No categories found. Sync in Settings?"
                                                            isLoading={isLoadingCategories}
                                                            disabled={isLoadingCategories || mutation.isPending}
                                                            allowClear={true}
                                                        />
                                                    )}
                                                />
                                                {categoryError && (
                                                    <Alert variant="destructive" className="mt-1 text-xs">
                                                        <AlertCircle className="h-3 w-3 mr-1 inline" />
                                                        <AlertDescription className="inline">{categoryError.message}</AlertDescription>
                                                    </Alert>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(lineTotal, form.watch('currency') as any)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeLineItem(index)}
                                                    disabled={fields.length <= 1}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={addNewLineItem}
                        >
                            Add Line Item
                        </Button>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add any notes for the supplier or internal reference..."
                                            className="resize-none"
                                            {...field}
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 mt-8">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending || isLoadingContacts || isLoadingProjects || isLoadingCategories}>
                        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isNew ? 'Create Purchase Order' : 'Update Purchase Order'}
                    </Button>
                </div>
            </form>
        </Form>
    );
};