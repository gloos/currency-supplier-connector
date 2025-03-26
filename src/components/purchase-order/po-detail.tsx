
import React from "react";
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

// Mock data for demo purposes
const mockPurchaseOrder = {
  id: "po-001",
  reference: "PO-2023-001",
  supplier: "ABC Supplier Ltd",
  supplierEmail: "accounts@abcsupplier.com",
  date: "2023-10-15",
  currency: "USD" as CurrencyCode,
  status: "Sent",
  notes: "Please deliver to our warehouse address.",
  items: [
    {
      id: "item-1",
      description: "Widget A Premium",
      quantity: 5,
      unitPrice: 125.50,
    },
    {
      id: "item-2",
      description: "Service Package B",
      quantity: 2,
      unitPrice: 250.00,
    },
    {
      id: "item-3",
      description: "Component X-1000",
      quantity: 10,
      unitPrice: 17.50,
    },
  ]
};

const PODetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // In a real app, fetch data based on ID
  const po = mockPurchaseOrder;
  
  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };
  
  const calculateSubtotal = () => {
    return po.items.reduce(
      (sum, item) => sum + calculateItemTotal(item.quantity, item.unitPrice), 
      0
    );
  };
  
  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.1; // Example 10% tax
  const total = subtotal + tax;
  
  const handleResendEmail = async () => {
    try {
      await emailService.sendPurchaseOrder(
        po.supplierEmail,
        po.reference,
        `Purchase Order with ${po.items.length} items, total: ${formatCurrency(total, po.currency)}`
      );
      
      toast({
        title: "Email Sent",
        description: `Purchase Order ${po.reference} sent to ${po.supplierEmail}`
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
          <Link to="/purchase-orders">
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
              <CardTitle className="font-display text-2xl">Purchase Order: {po.reference}</CardTitle>
              <CardDescription>
                Issued on {new Date(po.date).toLocaleDateString()}
              </CardDescription>
            </div>
            
            <div className="mt-4 md:mt-0 text-right">
              <div className="text-muted-foreground">Status</div>
              <span 
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  po.status === "Sent" 
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" 
                    : po.status === "Completed" 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {po.status}
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
                  <div className="font-medium">{po.supplier}</div>
                  <div className="text-muted-foreground">{po.supplierEmail}</div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Details</h3>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Reference</div>
                    <div>{po.reference}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Issue Date</div>
                    <div>{new Date(po.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Currency</div>
                    <div>{po.currency}</div>
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
                  {po.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, po.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          calculateItemTotal(item.quantity, item.unitPrice), 
                          po.currency
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
                  <div>{formatCurrency(subtotal, po.currency)}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-muted-foreground">Tax (10%)</div>
                  <div>{formatCurrency(tax, po.currency)}</div>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between font-medium text-lg">
                  <div>Total</div>
                  <div>{formatCurrency(total, po.currency)}</div>
                </div>
              </div>
            </div>
          </div>
          
          {po.notes && (
            <div>
              <h3 className="text-lg font-medium mb-2">Notes</h3>
              <Card>
                <CardContent className="p-4">
                  {po.notes}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </BlurCard>
    </div>
  );
};

export default PODetail;
