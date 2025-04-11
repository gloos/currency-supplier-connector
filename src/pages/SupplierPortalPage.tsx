import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatCurrency } from '@/utils/currency';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
    Card, 
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle 
} from "@/components/ui/card";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Type for PO data fetched by token
type PortalPurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
    po_lines: Database['public']['Tables']['po_lines']['Row'][];
    company: { name: string | null }; // Include company name
};

const SupplierPortalPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const queryClient = useQueryClient();

    // State for invoice upload form
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>("");
    const [supplierInvoiceAmount, setSupplierInvoiceAmount] = useState<string>("");

    const fetchPOByToken = async (token: string | undefined): Promise<PortalPurchaseOrder | null> => {
        if (!token) throw new Error("Missing access token.");

        // NOTE: This assumes RLS allows fetching based on the token, 
        // or you might need a dedicated RPC function (security definer)
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                po_lines (*),
                company:companies ( name ) 
            `)
            .eq('supplier_portal_token', token)
            .maybeSingle(); // Expecting one or none

        if (error) {
            console.error("Error fetching PO by token:", error);
            throw new Error(`Failed to load purchase order: ${error.message}`);
        }
        if (!data) {
            throw new Error("Invalid or expired link. Purchase order not found.");
        }
        return data as PortalPurchaseOrder;
    };

    const { data: purchaseOrder, isLoading, error, isError, refetch } = useQuery<
        PortalPurchaseOrder | null,
        Error
    >({
        queryKey: ['purchaseOrderByToken', token],
        queryFn: () => fetchPOByToken(token),
        enabled: !!token, // Only run query if token exists
        retry: false, // Don't retry on failure (e.g., invalid token)
        refetchOnWindowFocus: false, // No need to refetch constantly
    });

    // --- Mutation to update PO status ---
    const updateStatusMutation = useMutation<
        any, // Type for success response data
        Error, // Type for error
        { action: 'accept' | 'reject' } // Type for variables passed to mutationFn
    >({
        mutationFn: async ({ action }) => {
            if (!token) throw new Error("Token is missing.");

            const functionName = 'update-po-status-by-token';
            const { data, error } = await supabase.functions.invoke(functionName, {
                body: { token, action },
            });

            if (error) throw new Error(error.message || "Failed to invoke update status function.");
            if (data?.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data, variables) => {
            const actionText = variables.action === 'accept' ? 'accepted' : 'rejected';
            toast.success(`Purchase Order ${actionText}!`, {
                 description: data?.message || `PO ${purchaseOrder?.po_number} status updated.`,
            });
            // Refetch the PO data to show the updated status and hide buttons
            queryClient.invalidateQueries({ queryKey: ['purchaseOrderByToken', token] });
            // Optionally refetch the main app list if needed, though less critical here
            // queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); 
        },
        onError: (error) => {
            toast.error("Action Failed", {
                 description: error.message || "Could not update purchase order status.",
            });
        },
    });

    // --- Mutation for Invoice Upload ---
    const uploadInvoiceMutation = useMutation<
        any, // Success data type
        Error, // Error type
        FormData // Variables type (we'll send FormData)
    >({
        mutationFn: async (formData: FormData) => {
            // Add the token to the FormData before sending
            if (!token) throw new Error("Token is missing.");
            formData.append('token', token);
            
            const functionName = 'upload-supplier-invoice';
            // Invoke the function with FormData
            const { data, error } = await supabase.functions.invoke(functionName, {
                body: formData, // Send FormData directly
            });

            if (error) throw new Error(error.message || "Failed to invoke upload invoice function.");
            if (data?.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data) => {
            toast.success("Invoice Uploaded Successfully!", {
                 description: data?.message || `Invoice for PO ${purchaseOrder?.po_number} submitted.`,
            });
            // Refetch the PO data to show updated status (InvoiceUploaded)
            queryClient.invalidateQueries({ queryKey: ['purchaseOrderByToken', token] });
            // Optionally clear the form fields
            setInvoiceFile(null);
            setSupplierInvoiceNumber("");
            setSupplierInvoiceAmount("");
        },
        onError: (error) => {
            toast.error("Invoice Upload Failed", {
                 description: error.message || "Could not upload invoice.",
            });
        },
    });

    const handleAction = (action: 'accept' | 'reject') => {
        if (!token) return;
        updateStatusMutation.mutate({ action });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setInvoiceFile(event.target.files[0]);
        } else {
            setInvoiceFile(null);
        }
    };

    const handleInvoiceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!invoiceFile || !token) {
             toast.error("Please select an invoice file.");
             return;
        }
        
        // Create FormData object
        const formData = new FormData();
        formData.append('invoiceFile', invoiceFile);
        formData.append('supplierInvoiceNumber', supplierInvoiceNumber);
        formData.append('supplierInvoiceAmount', supplierInvoiceAmount);
        // The token will be added in the mutationFn

        uploadInvoiceMutation.mutate(formData);
    };

    // --- UI Rendering ---

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !purchaseOrder) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
                 <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Purchase Order</AlertTitle>
                    <AlertDescription>
                        {error?.message || "Could not load purchase order details. The link may be invalid or expired."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Calculate totals
    const calculateSubtotal = () => {
        return purchaseOrder.po_lines.reduce(
          (sum, line) => sum + (line.quantity * line.unit_price), 0
        );
    };
    const subtotal = calculateSubtotal();
    // Add tax/total logic if needed, mirroring po-detail for consistency
    const total = subtotal; // Assuming no tax for now

    // Determine UI states
    const showAcceptRejectActions = purchaseOrder?.status === 'SentToSupplier' && !updateStatusMutation.isSuccess;
    const showInvoiceUpload = 
        purchaseOrder?.status === 'AcceptedBySupplier' && 
        !uploadInvoiceMutation.isSuccess; // Hide form after successful upload
    const isAcceptRejectProcessing = updateStatusMutation.isPending;
    const isUploadProcessing = uploadInvoiceMutation.isPending;

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                           <CardTitle className="text-2xl font-bold">Purchase Order: {purchaseOrder.po_number}</CardTitle>
                           <CardDescription>
                             From: {purchaseOrder.company?.name ?? 'Your Client'} | 
                             Issued: {new Date(purchaseOrder.issue_date).toLocaleDateString()}
                           </CardDescription>
                        </div>
                        <div className="mt-4 sm:mt-0 text-right">
                            <StatusBadge status={purchaseOrder.status} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Optional: Add Supplier Info Display Here */}
                    
                    <h3 className="text-lg font-semibold border-b pb-1 mb-3">Order Details</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrder.po_lines.map((line) => (
                                <TableRow key={line.id}>
                                    <TableCell>{line.description}</TableCell>
                                    <TableCell className="text-right">{line.quantity}</TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(line.unit_price, purchaseOrder.currency)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(line.quantity * line.unit_price, purchaseOrder.currency)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4">
                        <div className="w-full max-w-xs space-y-1 text-right">
                             <div className="flex justify-between">
                                 <span className="text-muted-foreground">Subtotal:</span>
                                 <span>{formatCurrency(subtotal, purchaseOrder.currency)}</span>
                             </div>
                             {/* Add Tax Row if needed */}
                             <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                 <span>Total:</span>
                                 <span>{formatCurrency(total, purchaseOrder.currency)}</span>
                             </div>
                        </div>
                    </div>

                    {purchaseOrder.notes && (
                         <div>
                             <h3 className="text-lg font-semibold mb-2">Notes</h3>
                             <p className="text-sm text-muted-foreground whitespace-pre-wrap">{purchaseOrder.notes}</p>
                         </div>
                    )}

                </CardContent>
                
                {/* --- Invoice Upload Section --- */}
                {showInvoiceUpload && (
                    <form onSubmit={handleInvoiceSubmit}>
                        <CardHeader className="border-t">
                            <CardTitle>Upload Your Invoice</CardTitle>
                            <CardDescription>Upload your invoice for PO {purchaseOrder?.po_number}.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="supplierInvoiceNumber">Your Invoice Number</Label>
                                    <Input 
                                        id="supplierInvoiceNumber" 
                                        type="text"
                                        value={supplierInvoiceNumber}
                                        onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                                        placeholder="e.g., INV-12345"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                     <Label htmlFor="supplierInvoiceAmount">Your Invoice Amount ({purchaseOrder?.currency})</Label>
                                     <Input 
                                         id="supplierInvoiceAmount" 
                                         type="number"
                                         step="0.01"
                                         value={supplierInvoiceAmount}
                                         onChange={(e) => setSupplierInvoiceAmount(e.target.value)}
                                         placeholder={`e.g., ${purchaseOrder?.amount || '100.00'}`}
                                         required
                                     />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                 <Label htmlFor="invoiceFile">Invoice File (PDF recommended)</Label>
                                 <Input 
                                     id="invoiceFile" 
                                     type="file" 
                                     onChange={handleFileChange}
                                     accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" // Specify acceptable file types
                                     required 
                                 />
                                 {invoiceFile && <p className="text-xs text-muted-foreground">Selected: {invoiceFile.name}</p>}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-6">
                            <Button type="submit" disabled={!invoiceFile || isUploadProcessing}>
                                {isUploadProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Submit Invoice
                            </Button>
                        </CardFooter>
                    </form>
                )}
                 {/* Show confirmation after upload success */}
                 {uploadInvoiceMutation.isSuccess && (
                     <CardFooter className="border-t pt-4 text-center">
                         <p className="text-sm text-green-600 font-medium">
                             Thank you! Your invoice has been submitted for review.
                         </p>
                     </CardFooter>
                 )}

                {/* --- Accept/Reject Actions --- */}
                {showAcceptRejectActions && (
                    <CardFooter className="flex justify-end gap-4 border-t pt-6">
                        <Button 
                            variant="destructive" 
                            size="lg" 
                            onClick={() => handleAction('reject')}
                            disabled={isAcceptRejectProcessing}
                        >
                            {isAcceptRejectProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           Reject Order
                        </Button>
                        <Button 
                            variant="default" 
                            size="lg" 
                            onClick={() => handleAction('accept')}
                            disabled={isAcceptRejectProcessing}
                        >
                            {isAcceptRejectProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           Accept Order
                        </Button>
                    </CardFooter>
                )}

                {/* Show message if already processed */}
                {!isLoading && !isError && purchaseOrder && 
                    !showAcceptRejectActions && !updateStatusMutation.isSuccess && 
                    !showInvoiceUpload && !uploadInvoiceMutation.isSuccess && 
                    purchaseOrder.status !== 'SentToSupplier' && purchaseOrder.status !== 'AcceptedBySupplier' && (
                    <CardFooter className="border-t pt-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            This purchase order has already been {purchaseOrder.status === 'RejectedBySupplier' ? 'rejected' : 'processed'}.
                        </p>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default SupplierPortalPage; 