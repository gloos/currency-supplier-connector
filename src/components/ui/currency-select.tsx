
import React, { useState } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CurrencyCode, currencies } from "@/utils/currency";

interface CurrencySelectProps {
  value: CurrencyCode;
  onValueChange: (value: CurrencyCode) => void;
  className?: string;
}

const CurrencySelect = ({ 
  value, 
  onValueChange, 
  className 
}: CurrencySelectProps) => {
  return (
    <Select
      value={value}
      onValueChange={(val) => onValueChange(val as CurrencyCode)}
    >
      <SelectTrigger className={cn("w-[120px]", className)}>
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(currencies).map((currencyCode) => (
          <SelectItem 
            key={currencyCode} 
            value={currencyCode}
            className="flex items-center"
          >
            <span className="mr-2">{currencies[currencyCode as CurrencyCode].symbol}</span>
            <span>{currencyCode}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelect;
