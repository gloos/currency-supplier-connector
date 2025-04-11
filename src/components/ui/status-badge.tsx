import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Database } from '@/integrations/supabase/types';

// Define the type for the status prop using the generated Enum type
type POStatus = Database['public']['Enums']['po_status'];

interface StatusBadgeProps {
  status: POStatus | null | undefined;
}

// Helper function to map status to Badge variant and text
const getStatusAttributes = (status: POStatus | null | undefined): { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; text: string } => {
  switch (status) {
    case 'Draft':
      return { variant: 'secondary', text: 'Draft' };
    case 'SentToSupplier':
      return { variant: 'info', text: 'Sent to Supplier' };
    case 'AcceptedBySupplier':
      return { variant: 'success', text: 'Supplier Accepted' };
    case 'RejectedBySupplier':
      return { variant: 'destructive', text: 'Supplier Rejected' };
    case 'InvoiceUploaded':
      return { variant: 'info', text: 'Invoice Uploaded' };
    case 'InvoicePendingApproval': // Add this if needed
       return { variant: 'warning', text: 'Pending Approval' };
    case 'InvoiceApproved':
      return { variant: 'success', text: 'Invoice Approved' };
    case 'BilledInFreeAgent':
      return { variant: 'success', text: 'Billed in FA' };
    case 'Closed':
      return { variant: 'outline', text: 'Closed' };
    case 'Cancelled':
      return { variant: 'destructive', text: 'Cancelled' };
    default:
      return { variant: 'outline', text: status || 'Unknown' }; // Fallback
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { variant, text } = getStatusAttributes(status);

  // You might need to extend the Badge component's variants or use twMerge/clsx 
  // to add custom background/text colors for info, success, warning if they don't exist.
  // For simplicity, we'll map to existing variants here.
  // Example mapping assuming you have custom variants or base styles:
  let variantClass: "default" | "secondary" | "destructive" | "outline";
  switch (variant) {
      case 'success':
          variantClass = 'default'; // Assuming default is green-ish or use a custom 'success' variant
          break;
      case 'info':
          variantClass = 'secondary'; // Assuming secondary is blue-ish or use a custom 'info' variant
          break;
      case 'warning':
           variantClass = 'outline'; // Assuming outline is yellow-ish/orange or use custom 'warning'
           break;
      case 'destructive':
           variantClass = 'destructive';
           break;
       default:
           variantClass = variant;
           break;
  }


  return (
    <Badge variant={variantClass} className="capitalize">
      {text}
    </Badge>
  );
}; 