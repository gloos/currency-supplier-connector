
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Trash, Send, FileText } from "lucide-react";
import { freeAgentApi } from "@/utils/freeagent-api";
import { emailService } from "@/utils/email-service";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const POForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 }
  ]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems, 
      { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    } else {
      toast({
        title: "Error",
        description: "You need at least one line item",
        variant: "destructive"
      });
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reference || !supplierName || !supplierEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Check if line items are valid
    const invalidItems = lineItems.filter(
      item => !item.description || item.quantity <= 0 || item.unitPrice <= 0
    );
    
    if (invalidItems.length > 0) {
      toast({
        title: "Error",
        description: "Please complete all line items with valid values",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create purchase order object
      const purchaseOrder = {
        id: Date.now().toString(),
        reference,
        supplierRef: "sup_1", // In a real app, this would come from supplier selection
        supplierName,
        supplierEmail,
        currencyCode: currency,
        issueDate: new Date().toISOString(),
        items: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.quantity * item.unitPrice
        })),
        total: calculateTotal(),
        notes
      };
      
      // In a real app, save to database
      console.log("Creating PO:", purchaseOrder);
      
      // Create bill in FreeAgent
      await freeAgentApi.createBill({
        id: purchaseOrder.id,
        supplierRef: purchaseOrder.supplierRef,
        reference: purchaseOrder.reference,
        currencyCode: purchaseOrder.currencyCode,
        issueDate: purchaseOrder.issueDate,
        items: purchaseOrder.items,
        total: purchaseOrder.total
      });
      
      // Send email to supplier
      await emailService.sendPurchaseOrder(
        supplierEmail,
        reference,
        `Purchase Order with ${lineItems.length} items, total: ${formatCurrency(calculateTotal(), currency)}`
      );
      
      toast({
        title: "Success",
        description: "Purchase order created successfully"
      });
      
      // In a real app, navigate to the PO detail page
      setTimeout(() => {
        navigate("/");
      }, 1500);
      
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create purchase order",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BlurCard className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="font-display">Create Purchase Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="reference">PO Reference *</Label>
                <Input
                  id="reference"
                  placeholder="e.g., PO-2023-001"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="supplier">Supplier Name *</Label>
                <Input
                  id="supplier"
                  placeholder="Supplier name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Supplier Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="supplier@example.com"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <CurrencySelect
                  value={currency}
                  onValueChange={setCurrency}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or instructions"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Line Items</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addLineItem}
              >
                <Plus size={16} className="mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-border bg-background/50"
                >
                  <div className="col-span-12 md:col-span-6">
                    <Label htmlFor={`description-${item.id}`} className="sr-only">
                      Description
                    </Label>
                    <Input
                      id={`description-${item.id}`}
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="col-span-4 md:col-span-2">
                    <Label htmlFor={`quantity-${item.id}`} className="sr-only">
                      Quantity
                    </Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  
                  <div className="col-span-6 md:col-span-3">
                    <Label htmlFor={`price-${item.id}`} className="sr-only">
                      Unit Price
                    </Label>
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
                        className="pl-8"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                        {currency}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length <= 1}
                    >
                      <Trash size={16} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end">
            <div className="bg-secondary rounded-lg px-6 py-3 text-right">
              <div className="text-sm text-muted-foreground mb-1">Total</div>
              <div className="text-2xl font-display font-medium">
                {formatCurrency(calculateTotal(), currency)}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-32"
          >
            {isSubmitting ? (
              "Processing..."
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Create Purchase Order
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </BlurCard>
  );
};

export default POForm;
