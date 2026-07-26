"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ComboboxProps {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

function normalizeText(str: string) {
  return str.toLowerCase().trim().replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ");
}

/** Strip to letters+digits only for code comparisons (e.g. "ECE 420" → "ece420"). */
function alnum(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Score how well an option matches the search. Higher = better.
 * Returns 0 when it should be hidden.
 */
function scoreOption(
  option: { value: string; label: string },
  search: string
): number {
  const raw = search.trim();
  if (!raw) return 1;

  const searchLower = raw.toLowerCase();
  const searchAlnum = alnum(raw);
  const labelLower = option.label.toLowerCase();
  const valueLower = option.value.toLowerCase();

  // Class code is usually everything before " - "
  const dashIdx = labelLower.indexOf(" - ");
  const codePart =
    dashIdx >= 0 ? labelLower.slice(0, dashIdx).trim() : labelLower.split(" ")[0] ?? "";
  const namePart = dashIdx >= 0 ? labelLower.slice(dashIdx + 3).trim() : labelLower;
  const codeAlnum = alnum(codePart);

  // Parse "ECE 420", "ece420", "420", "ECE"
  const searchParts = searchLower.match(/^([a-z]+)?\s*(\d+[a-z]*)?$/i);
  const searchDept = searchParts?.[1]?.toLowerCase() ?? "";
  const searchNum = searchParts?.[2]?.toLowerCase() ?? "";
  const codeParts = codePart.match(/^([a-z]+)\s*(\d+[a-z]*)?/i);
  const codeDept = codeParts?.[1]?.toLowerCase() ?? "";
  const codeNum = codeParts?.[2]?.toLowerCase() ?? "";

  // Exact code match: "ECE 420" or "ece420"
  if (codeAlnum && searchAlnum && codeAlnum === searchAlnum) return 100;
  if (codePart === searchLower) return 100;

  // Code starts with full search (typed "ECE 42" → ECE 420)
  if (codeAlnum.startsWith(searchAlnum) && searchAlnum.length >= 2) return 90;
  if (codePart.startsWith(searchLower)) return 88;

  // Dept + number both provided: require both to match (fixes "ECE 420" matching all ECE)
  if (searchDept && searchNum) {
    if (codeDept === searchDept && codeNum.startsWith(searchNum)) return 85;
    if (codeDept === searchDept && codeNum.includes(searchNum)) return 70;
    // Dept matches but number doesn't — do not match on dept alone
    if (codeDept === searchDept) return 0;
  }

  // Only department typed: "ECE" → all ECE courses
  if (searchDept && !searchNum && /^[a-z]+$/i.test(searchAlnum)) {
    if (codeDept === searchDept) return 60;
    if (codeDept.startsWith(searchDept)) return 50;
  }

  // Only number typed: "420"
  if (!searchDept && searchNum) {
    if (codeNum === searchNum) return 80;
    if (codeNum.startsWith(searchNum)) return 65;
    if (codeNum.includes(searchNum)) return 40;
  }

  // Name / full label substring
  if (namePart.includes(searchLower)) return 35;
  if (labelLower.includes(searchLower) || valueLower.includes(searchLower)) return 30;
  if (alnum(labelLower).includes(searchAlnum) && searchAlnum.length >= 3) return 25;

  return 0;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No option found.",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [popoverWidth, setPopoverWidth] = React.useState<number>(300);
  const [search, setSearch] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(0);

  React.useEffect(() => {
    if (triggerRef.current && open) {
      setPopoverWidth(triggerRef.current.offsetWidth);
    }
    if (!open) {
      setSearch("");
      setHighlightIndex(0);
    } else {
      // Focus search after open so typing works immediately
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;

    return options
      .map((option) => ({ option, score: scoreOption(option, search) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.option.label.localeCompare(b.option.label);
      })
      .map(({ option }) => option);
  }, [options, search]);

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-combobox-index="${highlightIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const selectedOption = React.useMemo(() => {
    if (!value) return undefined;

    let found = options.find((option) => option.value === value);
    if (found) return found;

    found = options.find((option) => option.value.trim() === value.trim());
    if (found) return found;

    const normalizedValue = normalizeText(value);
    found = options.find(
      (option) => normalizeText(option.value) === normalizedValue
    );
    if (found) return found;

    const valueMatch = value.match(/^(.+?)\s*-\s*(.+)$/);
    if (valueMatch) {
      const valueCode = valueMatch[1].trim();
      const valueName = valueMatch[2].trim();
      found = options.find((option) => {
        const optMatch = option.value.match(/^(.+?)\s*-\s*(.+)$/);
        if (!optMatch) return false;
        return (
          optMatch[1].trim() === valueCode && optMatch[2].trim() === valueName
        );
      });
      if (found) return found;
    }

    return options.find(
      (option) =>
        option.value.toLowerCase().trim() === value.toLowerCase().trim()
    );
  }, [options, value]);

  const selectOption = React.useCallback(
    (optionValue: string) => {
      onValueChange(optionValue);
      setSearch("");
      setOpen(false);
    },
    [onValueChange]
  );

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) =>
        filteredOptions.length === 0
          ? 0
          : Math.min(i + 1, filteredOptions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filteredOptions[highlightIndex];
      if (option) selectOption(option.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          type="button"
        >
          <span className="truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 z-[100]"
        align="start"
        sideOffset={4}
        style={{ width: `${popoverWidth}px`, minWidth: "200px" }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          // Keep open if interacting with the trigger; otherwise allow close
          if (triggerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col">
          <div className="border-b p-2">
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="h-9"
            />
          </div>
          <div
            ref={listRef}
            className="max-h-[280px] overflow-y-auto overscroll-contain p-1"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = value === option.value;
                const isHighlighted = index === highlightIndex;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-combobox-index={index}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-left outline-none",
                      isHighlighted && "bg-accent text-accent-foreground",
                      !isHighlighted && "hover:bg-accent/70"
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onPointerDown={(e) => {
                      // Select on pointer down so Dialog/Popover focus traps can't steal the click
                      e.preventDefault();
                      e.stopPropagation();
                      selectOption(option.value);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
