
import React, { useState } from "react";
import { Link } from "react-router-dom";
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

// Mock data for demo purposes
const mockPurchaseOrders = [
  {
    id: "po-001",
    reference: "PO-2023-001",
    supplier: "ABC Supplier Ltd",
    date: "2023-10-15",
    currency: "USD" as CurrencyCode,
    total: 1250.75,
    status: "Sent"
  },
  {
    id: "po-002",
    reference: "PO-2023-002",
    supplier: "XYZ Corporation",
    date: "2023-10-20",
    currency: "EUR" as CurrencyCode,
    total: 870.00,
    status: "Draft"
  },
  {
    id: "po-003",
    reference: "PO-2023-003",
    supplier: "Global Imports",
    date: "2023-10-25",
    currency: "GBP" as CurrencyCode,
    total: 1520.50,
    status: "Completed"
  }
];

const POList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredPOs = mockPurchaseOrders.filter(po => 
    po.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <BlurCard className="w-full">
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="font-display text-xl font-medium">Purchase Orders</h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Input
              placeholder="Search by reference or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-80"
            />
            <Button asChild>
              <Link to="/create-po">Create New</Link>
            </Button>
          </div>
        </div>
        
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Reference</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow key={po.id} className="group">
                    <TableCell className="font-medium">{po.reference}</TableCell>
                    <TableCell>{po.supplier}</TableCell>
                    <TableCell>
                      {new Date(po.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(po.total, po.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span 
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          po.status === "Sent" 
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" 
                            : po.status === "Completed" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {po.status}
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
                            <Link to={`/purchase-orders/${po.id}`} className="flex items-center cursor-pointer">
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
};

export default POList;
