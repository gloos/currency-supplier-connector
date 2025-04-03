"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { ControllerRenderProps } from 'react-hook-form'; // Import type

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  field: ControllerRenderProps<any, any>; // From react-hook-form
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  nullable?: boolean; // Allow clearing the date
}

export function DatePicker({ field, placeholder = "Pick a date", disabled, className, nullable = false }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    field.onChange(date); // Update RHF state
    setOpen(false);
  }
  
  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent popover trigger
      field.onChange(null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !field.value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {field.value ? format(field.value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={field.value ? new Date(field.value) : undefined}
          onSelect={handleSelect}
          initialFocus
          disabled={disabled}
        />
         {nullable && field.value && (
             <div className="p-2 border-t border-border">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-destructive hover:text-destructive"
                    onClick={handleClear}
                >
                    Clear
                </Button>
             </div>
        )}
      </PopoverContent>
    </Popover>
  )
} 