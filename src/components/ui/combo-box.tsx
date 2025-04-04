"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string; // Current selected value
  onChange: (value: string) => void; // Function to call when selection changes
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  disabled?: boolean;
  isLoading?: boolean;
  allowClear?: boolean; // Add allowClear prop
  className?: string; // Allow passing additional classes
}

export function Combobox({ 
    options,
    value,
    onChange,
    placeholder = "Select option...", 
    searchPlaceholder = "Search options...", 
    notFoundMessage = "No options found.",
    disabled = false,
    isLoading = false,
    allowClear = false, // Default to false
    className
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selectedLabel = options.find((option) => option.value === value)?.label

  // Function to handle clearing the selection
  const handleClear = () => {
      onChange(""); // Set value to empty string (or null if preferred)
      setOpen(false); // Close the popover
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)} // Combine classes
          disabled={disabled || isLoading}
        >
          {isLoading ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
             selectedLabel || placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{notFoundMessage}</CommandEmpty>
            <CommandGroup>
              {/* Add Clear option if allowClear is true and a value is selected */}
              {allowClear && value && (
                <CommandItem
                  key="clear-selection"
                  value="_clear"
                  onSelect={handleClear} // Call handleClear on select
                  className="text-muted-foreground text-sm italic"
                >
                  {/* Optional: Add an icon like XCircle? */}
                  Clear selection
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value} // Use value for CommandItem value
                  onSelect={(currentValue) => {
                    // currentValue here is the *value* selected
                    onChange(currentValue === value ? "" : currentValue) // Deselect if same value clicked, otherwise update
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 