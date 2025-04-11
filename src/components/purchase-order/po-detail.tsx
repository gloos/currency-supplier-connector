import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import BlurCard from "@/components/ui/blur-card";
import { Button } from "@/components/ui/button";
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
import { formatCurrency } from "@/utils/currency";
import { ArrowLeft, Printer, Mail, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { emailService } from "@/utils/email-service";
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { Database } from '@/integrations/supabase/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Define the type for a Purchase Order including the enum type and company details
type PurchaseOrderWithDetails = Database['public']['Tables']['purchase_orders']['Row'] & {
    po_lines: Database['public']['Tables']['po_lines']['Row'][];
    company_details?: Database['public']['Tables']['company_details']['Row'] | null;
};

export default function PODetail() {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoPublicUrl, setLogoPublicUrl] = useState<string | null>(null);
  const params = useParams<{ companySlug: string; id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const fetchPurchaseOrderAndDetails = async () => {
      setLoading(true);
      setError(null);
      setLogoPublicUrl(null);
      try {
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            po_lines (*)
          `)
          .eq('id', params.id)
          .single();

        if (poError) throw new Error(`Fetching PO failed: ${poError.message}`);
        if (!po) throw new Error('Purchase order not found.');

        let companyDetails = null;
        if (po.company_id) {
          const { data: details, error: detailsError } = await supabase
            .from('company_details')
            .select('*')
            .eq('company_id', po.company_id)
            .single();
            
          if (detailsError) {
             console.warn(`Could not fetch company details: ${detailsError.message}`);
          } else {
             companyDetails = details;
             if (companyDetails?.logo_storage_path) {
                 const { data: urlData } = supabase.storage.from('companylogos').getPublicUrl(companyDetails.logo_storage_path);
                 setLogoPublicUrl(urlData?.publicUrl ?? null);
             }
          }
        }

        setPurchaseOrder({ ...po, company_details: companyDetails });

      } catch (error) {
        console.error('Error fetching purchase order details:', error);
        setError(error instanceof Error ? error.message : 'Failed to load purchase order');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrderAndDetails();
  }, [params.id]);

  // --- Send Email Mutation ---
  const sendEmailMutation = useMutation<any, Error, string>({
    mutationFn: async (poId: string) => {
      const functionName = 'send-po-email';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { poId },
      });

      if (error) throw new Error(error.message || "Failed to invoke send email function.");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Email Sent", description: data?.message || "PO sent to supplier." });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', params.id] }); 
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
    onError: (error) => {
      toast({ title: "Error Sending Email", description: error.message, variant: 'destructive' });
    },
  });

  const handleSendToSupplier = () => {
    if (purchaseOrder?.id) {
      sendEmailMutation.mutate(purchaseOrder.id);
    } else {
      toast({ title: "Error", description: "Purchase Order ID is missing.", variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <BlurCard className="w-full">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </BlurCard>
    );
  }

  if (error) {
    return (
      <BlurCard className="w-full">
        <div className="flex min-h-[400px] items-center justify-center text-red-500">
          Error: {error}
        </div>
      </BlurCard>
    );
  }

  if (!purchaseOrder) {
    return (
      <BlurCard className="w-full">
        <div className="flex min-h-[400px] items-center justify-center text-gray-500">
          Purchase order not found
        </div>
      </BlurCard>
    );
  }

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };
  
  const calculateSubtotal = () => {
    return purchaseOrder.po_lines.reduce(
      (sum: number, line: any) => sum + calculateItemTotal(line.quantity, line.unit_price), 
      0
    );
  };
  
  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.1; // Example 10% tax
  const total = subtotal + tax;
  
  const handleResendEmail = async () => {
    try {
      await emailService.sendPurchaseOrder(
        purchaseOrder.supplier_email,
        purchaseOrder.po_number,
        `Purchase Order with ${purchaseOrder.po_lines.length} items, total: ${formatCurrency(total, purchaseOrder.currency)}`
      );
      
      toast({
        title: "Email Sent",
        description: `Purchase Order ${purchaseOrder.po_number} sent to ${purchaseOrder.supplier_email}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive"
      });
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/company/${params.companySlug}/purchase-orders`}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Purchase Orders
          </Link>
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleResendEmail}>
            <Mail size={16} className="mr-2" />
            Resend Email
          </Button>
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Download PDF
          </Button>
          {purchaseOrder?.status === 'Draft' && (
            <Button 
              variant="default"
              size="sm" 
              onClick={handleSendToSupplier}
              disabled={sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? (
                 <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                 <Mail size={16} className="mr-2" />
              )}
              Send to Supplier
            </Button>
          )}
        </div>
      </div>
      
      <BlurCard className="w-full print:shadow-none">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle className="font-display text-2xl">Purchase Order: {purchaseOrder.po_number}</CardTitle>
              <CardDescription>
                Issued on {new Date(purchaseOrder.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
            
            <div className="mt-4 md:mt-0 text-right">
              <div className="text-muted-foreground">Status</div>
              <StatusBadge status={purchaseOrder.status} />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-2">Supplier</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="font-medium">{purchaseOrder.supplier_name}</div>
                  <div className="text-muted-foreground">{purchaseOrder.supplier_email}</div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Your Company</h3>
              {logoPublicUrl ? (
                <img 
                    src={logoPublicUrl} 
                    alt={`${purchaseOrder.company_details?.name ?? 'Company'} logo`} 
                    className="max-h-16 w-auto mb-2 border rounded p-1 bg-white dark:bg-gray-800" 
                />
              ) : purchaseOrder.company_details?.name ? (
                <h3 className="text-lg font-semibold mb-2">{purchaseOrder.company_details.name}</h3>
              ) : (
                <div className="h-16 flex items-center text-muted-foreground text-sm">Company Details</div>
              )}
              {purchaseOrder.company_details && (
                <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
                    {purchaseOrder.company_details.address && (
                        <div className="whitespace-pre-line">{purchaseOrder.company_details.address}</div>
                    )}
                    {purchaseOrder.company_details.registration_number && (
                        <div><span className="font-medium">Reg:</span> {purchaseOrder.company_details.registration_number}</div>
                    )}
                    {purchaseOrder.company_details.sales_tax_registration_number && (
                        <div><span className="font-medium">VAT:</span> {purchaseOrder.company_details.sales_tax_registration_number}</div>
                    )}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Purchase Order Details</h3>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <div className="text-muted-foreground">Reference</div>
                  <div>{purchaseOrder.po_number}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-muted-foreground">Issue Date</div>
                  <div>{new Date(purchaseOrder.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-muted-foreground">Currency</div>
                  <div>{purchaseOrder.currency}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Line Items</h3>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.po_lines.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.unit_price, purchaseOrder.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          calculateItemTotal(line.quantity, line.unit_price), 
                          purchaseOrder.currency
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="flex justify-end">
            <div className="w-full md:w-64">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="text-muted-foreground">Subtotal</div>
                  <div>{formatCurrency(subtotal, purchaseOrder.currency)}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-muted-foreground">Tax (10%)</div>
                  <div>{formatCurrency(tax, purchaseOrder.currency)}</div>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between font-medium text-lg">
                  <div>Total</div>
                  <div>{formatCurrency(total, purchaseOrder.currency)}</div>
                </div>
              </div>
            </div>
          </div>
          
          {purchaseOrder.notes && (
            <div>
              <h3 className="text-lg font-medium mb-2">Notes</h3>
              <Card>
                <CardContent className="p-4">
                  {purchaseOrder.notes}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </BlurCard>
    </div>
  );
}
