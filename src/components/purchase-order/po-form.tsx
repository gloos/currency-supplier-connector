import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query"; // Added useMutation
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CurrencySelect from "@/components/ui/currency-select";
import BlurCard from "@/components/ui/blur-card";
import { useToast } from "@/hooks/use-toast";
import { CurrencyCode, formatCurrency } from "@/utils/currency";
import { Plus, Trash, Send, User, Mail, Loader2 } from "lucide-react";
import { freeAgentApi } from "@/utils/freeagent-api"; // Keep for getSuppliers
import { PurchaseOrder, Supplier } from "@/types/freeagent"; // Keep Supplier type
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client'; // Use client instance
// Removed PurchaseOrder type import if it's only used for the old payload structure

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // Renamed from price for clarity
}

// Removed Supplier interface if defined elsewhere (e.g., types/freeagent.ts)
// interface Supplier { ... }

const POForm = () => {
  const navigate = useNavigate();
  const params = useParams<{ companySlug: string }>(); // Ensure companySlug is typed
  const { toast } = useToast();

  // --- State Variables ---
  const [reference, setReference] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState(""); // Stores FreeAgent Contact URL/ID
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("GBP"); // Default to GBP or fetch from prefs
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 }
  ]);
  const [isFreeAgentConnected, setIsFreeAgentConnected] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // Specific form error state
  const [companyId, setCompanyId] = useState<string | null>(null);
  // TODO: Add state for selectedProjectId if implementing project selection

  // --- Check FreeAgent Connection Status ---
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const credentials = await freeAgentApi.loadCredentials();
        setIsFreeAgentConnected(!!credentials?.accessToken);
      } catch (error) {
        console.error("Error checking FreeAgent connection:", error);
        setIsFreeAgentConnected(false);
      }
    };
    checkConnection();
  }, []);

  // --- Fetch Company ID ---
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!params.companySlug) {
        console.error('Company slug not found in params');
        setFormError('Could not identify the company.');
        return;
      }
      try {
        const { data: company, error } = await supabase
          .from('companies')
          .select('id')
          .eq('slug', params.companySlug)
          .single();

        if (error) throw error;
        if (company) {
          setCompanyId(company.id);
        } else {
          throw new Error('Company not found for this slug.');
        }
      } catch (error) {
        console.error('Error fetching company ID:', error);
        setFormError(error instanceof Error ? error.message : 'Failed to load company information.');
        toast({ title: "Error", description: "Failed to load company information.", variant: "destructive" });
      }
    };
    fetchCompanyId();
  }, [params.companySlug, toast]);

  // --- Fetch Suppliers from FreeAgent (using React Query) ---
  // TODO: Consider moving this fetch to a serverless function if it becomes complex or needs secrets later
  const {
    data: suppliers = [],
    isLoading: isLoadingSuppliers,
    error: suppliersError
  } = useQuery<Supplier[], Error>({ // Explicitly type query data and error
    queryKey: ["freeAgentSuppliers"], // Use a more specific key
    queryFn: async () => {
        // This still runs client-side, ensure getSuppliers doesn't expose secrets
        // If getSuppliers needs to be secure, refactor it to call an Edge Function
        return await freeAgentApi.getSuppliers();
    },
    enabled: isFreeAgentConnected, // Only fetch if connected
    staleTime: 5 * 60 * 1000, // Cache suppliers for 5 minutes
  });

  // --- Show Toast on Supplier Fetch Error ---
  useEffect(() => {
    if (suppliersError) {
      toast({
        title: "Error Loading Suppliers",
        description: suppliersError.message || "Could not fetch suppliers from FreeAgent.",
        variant: "destructive"
      });
    }
  }, [suppliersError, toast]);

  // --- Mutation for Creating Purchase Order via Edge Function ---
  const { mutate: createPurchaseOrder, isPending: isCreatingPO } = useMutation({
    mutationFn: async (payload: any) => {
      console.log("Invoking create-purchase-order Edge Function with payload:", payload);
      const { data, error } = await supabase.functions.invoke(
        'create-purchase-order',
        { body: payload }
      );

      if (error) {
        console.error('Edge Function invocation error:', error);
        throw new Error(error.message || 'Failed to invoke backend function.');
      }
      if (data?.error) {
        console.error('Edge Function execution error:', data.error);
        throw new Error(data.error);
      }
      if (!data?.success) {
         throw new Error(data?.message || 'Unknown error creating purchase order.');
      }
      return data; // Contains { success, message, purchaseOrderId, freeagentBillUrl }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Purchase Order created successfully.",
      });
      // Navigate to the PO list or the newly created PO detail page
      navigate(`/company/${params.companySlug}/purchase-orders`);
      // Optionally navigate to detail: navigate(`/company/${params.companySlug}/purchase-orders/${data.purchaseOrderId}`);
    },
    onError: (error: Error) => {
      console.error("Error creating purchase order:", error);
      setFormError(error.message || 'Failed to create purchase order.');
      toast({
        title: "Error Creating PO",
        description: error.message || 'An unexpected error occurred.',
        variant: "destructive",
      });
    },
  });


  // --- Line Item Management ---
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) {
      toast({ title: "Cannot Remove", description: "A purchase order must have at least one line item.", variant: "destructive"});
      return;
    }
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // --- Calculate Total ---
  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return sum + (quantity * price);
    }, 0);
  };

  // --- Form Submission Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Clear previous errors

    // --- Client-Side Validation ---
    if (!companyId) {
        toast({ title: "Error", description: "Company information not loaded. Cannot create PO.", variant: "destructive" });
        return;
    }
    if (!reference.trim()) {
        toast({ title: "Validation Error", description: "Please enter a PO Reference number.", variant: "destructive" });
        return;
    }
    if (!selectedSupplierId) {
        toast({ title: "Validation Error", description: "Please select a Supplier.", variant: "destructive" });
        return;
    }
    const invalidItem = lineItems.find(item => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0);
    if (invalidItem) {
        toast({ title: "Validation Error", description: `Please complete Line Item "${invalidItem.description || 'Unnamed'}" with a valid quantity and non-negative price.`, variant: "destructive" });
        return;
    }
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
     if (!supplier) {
         toast({ title: "Validation Error", description: "Selected supplier could not be found.", variant: "destructive" });
         return;
     }

    // --- Prepare Payload for Edge Function ---
    const payload = {
      reference: reference.trim(),
      supplierRef: supplier.id, // Send the FreeAgent Contact URL/ID
      // Optional: Send name/email if your function needs them for DB saving
      // supplierName: supplier.name,
      // supplierEmail: supplier.email,
      currencyCode: currency,
      items: lineItems.map(item => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        price: Number(item.unitPrice), // Send unit price
      })),
      notes: notes.trim(),
      companyId: companyId,
      // TODO: Add freeagent_project_id here when implemented
      // freeagent_project_id: selectedProjectId,
    };

    // --- Call the Mutation ---
    createPurchaseOrder(payload);
  };

  // --- Get Selected Supplier Details ---
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // --- Render Component ---
  return (
    <BlurCard className="w-full max-w-4xl mx-auto">
      {!isFreeAgentConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>FreeAgent Connection Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please connect to FreeAgent in settings before creating purchase orders.
            </p>
            <Button asChild>
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-display">Create New Purchase Order</CardTitle>
            {formError && (
                 <p className="text-sm text-destructive mt-2">{formError}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* --- PO Header Fields --- */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {/* PO Reference */}
                <div>
                  <Label htmlFor="reference">PO Reference *</Label>
                  <Input
                    id="reference"
                    placeholder="e.g., PO-2024-001"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    disabled={isCreatingPO}
                  />
                </div>

                {/* Supplier Selection */}
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select
                    value={selectedSupplierId}
                    onValueChange={setSelectedSupplierId}
                    disabled={isLoadingSuppliers || isCreatingPO}
                  >
                    <SelectTrigger id="supplier" className="w-full">
                      <SelectValue placeholder={isLoadingSuppliers ? "Loading..." : "Select a supplier"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingSuppliers ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">Loading suppliers...</div>
                      ) : suppliers.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">No suppliers found in FreeAgent.</div>
                      ) : (
                        suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name || `Contact ID: ${supplier.id.split('/').pop()}`} {/* Fallback display */}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Supplier Info */}
                {selectedSupplier && (
                  <div className="p-3 bg-secondary/40 rounded-md border border-border/50 text-sm">
                    <div className="font-medium mb-1">Selected Supplier:</div>
                    <div className="flex items-center text-muted-foreground">
                      <User className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{selectedSupplier.name}</span>
                    </div>
                    {selectedSupplier.email && (
                      <div className="mt-1 flex items-center text-muted-foreground">
                        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{selectedSupplier.email}</span>
                      </div>
                    )}
                     <div className="mt-1 flex items-center text-muted-foreground text-xs">
                       <span className="font-mono break-all">ID: {selectedSupplier.id}</span>
                     </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Currency */}
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <CurrencySelect
                    value={currency}
                    onValueChange={setCurrency}
                    disabled={isCreatingPO}
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional notes or instructions for the supplier"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    disabled={isCreatingPO}
                  />
                </div>
                {/* TODO: Add Project Selection Dropdown Here */}
              </div>
            </div>

            {/* --- Line Items Section --- */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  disabled={isCreatingPO}
                >
                  <Plus size={16} className="mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-3 items-end p-3 rounded-lg border border-border bg-background/50"
                  >
                    {/* Description */}
                    <div className="col-span-12 md:col-span-6">
                      <Label htmlFor={`description-${item.id}`} className="text-xs mb-1 block">Description *</Label>
                      <Input
                        id={`description-${item.id}`}
                        placeholder="Item or service description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        required
                        disabled={isCreatingPO}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 md:col-span-2">
                      <Label htmlFor={`quantity-${item.id}`} className="text-xs mb-1 block">Quantity *</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="0.01" // Or 1 if only whole numbers allowed
                        step="any" // Allow decimals if needed
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        required
                        disabled={isCreatingPO}
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-6 md:col-span-3">
                       <Label htmlFor={`price-${item.id}`} className="text-xs mb-1 block">Unit Price *</Label>
                      <div className="relative">
                        <Input
                          id={`price-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit price"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          required
                          disabled={isCreatingPO}
                          className="pl-8" // Adjust padding for currency symbol
                        />
                        {/* Display currency symbol - ensure currency state is updated */}
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground text-sm">
                           {currencies[currency]?.symbol || currency}
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-2 md:col-span-1 flex justify-end pb-1"> {/* Align button better */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        disabled={isCreatingPO || lineItems.length <= 1}
                        aria-label="Remove line item"
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 disabled:text-muted-foreground disabled:hover:bg-transparent"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- Totals Section --- */}
            <div className="flex justify-end mt-6">
              <div className="bg-secondary rounded-lg px-6 py-4 text-right w-full sm:w-auto min-w-[200px]">
                <div className="text-sm text-muted-foreground mb-1">Order Total</div>
                <div className="text-2xl font-display font-semibold">
                  {formatCurrency(calculateTotal(), currency)}
                </div>
              </div>
            </div>
          </CardContent>

          {/* --- Footer Actions --- */}
          <CardFooter className="flex justify-end space-x-4 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/company/${params.companySlug}/purchase-orders`)} // Navigate back to list for the company
              disabled={isCreatingPO}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreatingPO || !selectedSupplierId || !companyId} // Disable if submitting or required info missing
              className="min-w-40" // Give button more width
            >
              {isCreatingPO ? (
                 <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating PO...
                 </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Create Purchase Order
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </BlurCard>
  );
};

export default POForm;