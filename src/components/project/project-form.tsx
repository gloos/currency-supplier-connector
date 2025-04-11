import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { FREEAGENT_CURRENCIES } from '@/lib/constants';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Combobox, ComboboxOption } from '@/components/ui/combo-box';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// --- Type Aliases ---
type CachedContact = Database['public']['Tables']['cached_contacts']['Row'];

// --- Zod Schema Definition ---
const projectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    contact_url: z.string().min(1, "Customer contact is required"), // FreeAgent Contact URL
    initial_invoicing_amount: z.number().positive("Invoicing amount must be positive"),
    currency: z.string().min(1, "Currency is required"),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// --- ProjectForm Component ---
export const ProjectForm: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const companyId = user?.company?.id;
    const companySlug = user?.company?.slug;
    const defaultCurrency = user?.company?.fa_default_currency || "GBP";

    // --- React Hook Form Setup ---
    const form = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: "",
            contact_url: "",
            initial_invoicing_amount: 0,
            currency: defaultCurrency,
        },
    });

    // --- Data Fetching (Contacts for Customer Dropdown) ---
    const { data: contactOptions, isLoading: isLoadingContacts, error: contactError } = useQuery<
        ComboboxOption[], Error
    >({
        queryKey: ['cachedContacts', companyId, 'all'], // Changed from 'customers' to 'all'
        queryFn: async (): Promise<ComboboxOption[]> => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('cached_contacts')
                .select('freeagent_url, name') // Removed is_customer from select
                .eq('company_id', companyId)
                // .eq('is_customer', true) // REMOVED filter for is_customer
                .order('name', { ascending: true });

            if (error) {
                console.error("Error fetching customer contacts:", error);
                throw new Error(`Failed to load customer contacts: ${error.message}`);
            }
            return (data as CachedContact[] | null)?.map(c => ({ value: c.freeagent_url, label: c.name ?? 'Unnamed Contact' })) ?? [];
        },
        enabled: !!companyId,
        staleTime: 10 * 60 * 1000,
    });

    // --- Form Submission Logic (Mutation to call Edge Function) ---
    const mutation = useMutation<any, Error, ProjectFormData>({
        mutationFn: async (formData: ProjectFormData) => {
            if (!companyId || !user?.id) {
                throw new Error("User or company information is missing.");
            }
            const functionName = 'create-project'; // Name of the edge function to create
            const payload = {
                ...formData,
                companyId: companyId,
                userId: user.id,
            };
            console.log("Invoking create-project Edge Function with payload:", payload);
            const { data, error } = await supabase.functions.invoke(functionName, { body: payload });

            if (error) {
                console.error("Edge function invocation error:", error);
                throw new Error(error.message || `Failed to create project.`);
            }
            if (data?.error) {
                console.error("Edge function execution error:", data.error);
                throw new Error(data.error);
            }
            console.log("Edge function success data:", data);
            return data;
        },
        onSuccess: (data) => {
            toast("Project created successfully!");
            queryClient.invalidateQueries({ queryKey: ['cachedProjects', companyId] }); // Invalidate project cache
            // Redirect to the projects list or the new project detail page (if available)
            const redirectPath = companySlug ? `/company/${companySlug}/projects` : '/dashboard'; // Adjust as needed
            navigate(redirectPath);
        },
        onError: (error) => {
            toast("Error Creating Project", {
                description: error.message,
            });
        },
    });

    const onSubmit = (data: ProjectFormData) => {
        mutation.mutate(data);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Create New Project</CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <CardContent className="space-y-4">
                        {/* Project Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Website Redesign" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Customer Contact */}
                        <FormField
                            control={form.control}
                            name="contact_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Customer *</FormLabel>
                                    <FormControl>
                                         <Combobox
                                            options={contactOptions || []}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select customer..."
                                            isLoading={isLoadingContacts}
                                            disabled={isLoadingContacts}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Initial Invoicing Amount */}
                        <FormField
                            control={form.control}
                            name="initial_invoicing_amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Initial Invoicing Amount *</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g., 5000" 
                                            {...field} 
                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)} // Ensure value is number
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Currency */}
                        <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Currency *</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select currency" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {FREEAGENT_CURRENCIES.map((currency) => (
                                                <SelectItem key={currency.code} value={currency.code}>
                                                    {currency.code} - {currency.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Project
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}; 