import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import BlurCard from "@/components/ui/blur-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { formatCurrency, CurrencyCode } from "@/utils/currency";
import { Eye, MoreHorizontal, Mail, FileText, Download } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

export default function POList() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams<{ companySlug: string }>();

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        if (!params.companySlug) {
          setError('Company slug is required');
          setLoading(false);
          return;
        }

        // First get the company ID from the slug
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, name, slug')
          .eq('slug', params.companySlug)
          .maybeSingle();

        if (companyError) {
          console.error('Error fetching company:', companyError);
          throw companyError;
        }

        if (!company) {
          throw new Error(`Company not found with slug: ${params.companySlug}`);
        }

        // Then fetch POs for this company
        const { data: pos, error: posError } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            po_lines (*)
          `)
          .eq('company_id', company.id)
          .order('created_at', { ascending: false });

        if (posError) {
          console.error('Error fetching purchase orders:', posError);
          throw posError;
        }

        setPurchaseOrders(pos || []);
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        setError(error instanceof Error ? error.message : 'Failed to load purchase orders');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, [params.companySlug]);

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

  return (
    <BlurCard className="w-full">
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="font-display text-xl font-medium">Purchase Orders</h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Input
              placeholder="Search by reference or supplier..."
              className="w-full md:w-80"
            />
            <Button asChild>
              <Link
                to={`/company/${params.companySlug}/purchase-orders/new`}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Create New PO
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                purchaseOrders.map((po: any) => (
                  <TableRow key={po.id} className="group">
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell>
                      {new Date(po.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(po.amount, po.currency as CurrencyCode)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span 
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          po.status === "sent" 
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" 
                            : po.status === "completed" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/company/${params.companySlug}/purchase-orders/${po.id}`} className="flex items-center cursor-pointer">
                              <Eye size={16} className="mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center cursor-pointer">
                            <Mail size={16} className="mr-2" />
                            Email to Supplier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center cursor-pointer">
                            <FileText size={16} className="mr-2" />
                            Create Bill
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center cursor-pointer">
                            <Download size={16} className="mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </BlurCard>
  );
}
