import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getCurrencies, type CurrencyOption } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencySelectProps {
  /** Selected currency code (defaults to INR). */
  value: string;
  /** Fires with the new code and its full option. */
  onChange: (code: string, option: CurrencyOption) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * "Pay in" currency picker. Searchable, because the list covers every currency
 * Razorpay accepts. Type a code or name to filter. Brand styled, 44px tall.
 * Pure presentation: value plus onChange.
 */
export function CurrencySelect({ value, onChange, disabled, className }: CurrencySelectProps) {
  const [options, setOptions] = useState<CurrencyOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrencies().then((list) => {
      if (active) setOptions(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const selected = options.find((o) => o.code === value);

  const handleSelect = (code: string) => {
    const option = options.find((o) => o.code === code);
    if (option) onChange(code, option);
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Pay in</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Choose your currency"
            disabled={disabled}
            className="h-11 w-[160px] justify-between rounded-lg border-border font-normal focus:ring-primary/40"
          >
            <span className="truncate">
              {selected ? `${selected.code} ${selected.symbol}` : value || "Currency"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        {/* align end + collision padding keeps the panel inside the cart
            sheet instead of clipping at the viewport edge */}
        <PopoverContent className="w-[300px] p-0" align="end" collisionPadding={12}>
          <Command
            filter={(itemValue, search) => {
              // itemValue is "CODE Name"; match on either the code or the name.
              return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Search currency or code" className="h-11" />
            <CommandList
              className="max-h-[260px] overflow-y-auto"
              onWheel={(e) => e.stopPropagation()}
            >
              <CommandEmpty>No currency found.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.code}
                    value={`${o.code} ${o.label}`}
                    onSelect={() => handleSelect(o.code)}
                    className="group min-h-[44px] cursor-pointer gap-2"
                  >
                    <Check
                      className={cn("h-4 w-4 shrink-0", o.code === value ? "opacity-100" : "opacity-0")}
                      aria-hidden="true"
                    />
                    <span className="w-12 shrink-0 font-semibold">{o.code}</span>
                    {/* muted grays flip light on the blue highlighted row —
                        gray-on-blue was unreadable (D20 bug class) */}
                    <span className="w-6 shrink-0 text-muted-foreground group-data-[selected=true]:text-accent-foreground/85">{o.symbol}</span>
                    <span className="flex-1 text-sm leading-tight text-muted-foreground group-data-[selected=true]:text-accent-foreground">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
