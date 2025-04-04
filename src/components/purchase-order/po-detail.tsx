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
import { formatCurrency, CurrencyCode } from "@/utils/currency";
import { ArrowLeft, Printer, Mail, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { emailService } from "@/utils/email-service";
import { supabase } from '@/integrations/supabase/client';

export default function PODetail() {
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      try {
        // First get the company ID from the slug
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('slug', params.companySlug)
          .single();

        if (!company) {
          throw new Error('Company not found');
        }

        // Then fetch PO details ensuring it belongs to this company
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            po_lines (*)
          `)
          .eq('company_id', company.id)
          .eq('id', params.id)
          .single();

        if (poError) throw poError;
        if (!po) throw new Error('Purchase order not found');

        setPurchaseOrder(po);
      } catch (error) {
        console.error('Error fetching purchase order:', error);
        setError(error instanceof Error ? error.message : 'Failed to load purchase order');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrder();
  }, [params.companySlug, params.id]);

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
        purchaseOrder.reference,
        `Purchase Order with ${purchaseOrder.po_lines.length} items, total: ${formatCurrency(total, purchaseOrder.currency)}`
      );
      
      toast({
        title: "Email Sent",
        description: `Purchase Order ${purchaseOrder.reference} sent to ${purchaseOrder.supplier_email}`
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
              <span 
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  purchaseOrder.status === "Sent" 
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" 
                    : purchaseOrder.status === "Completed" 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {purchaseOrder.status}
              </span>
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
              <h3 className="text-lg font-medium mb-2">Details</h3>
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
