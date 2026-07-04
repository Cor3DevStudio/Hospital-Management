import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ChargeItemOption = {
  id: string;
  /** Primary name shown in results (e.g. Paracetamol 500mg). */
  label: string;
  /** Optional code / category line. */
  secondary?: string;
  /** Optional right-side meta (e.g. stock, unit). */
  meta?: string;
};

type ChargeItemPickerProps = {
  items: ChargeItemOption[];
  /** Selected item id, or empty / "none" when cleared. */
  value?: string;
  onSelect: (id: string, item?: ChargeItemOption) => void;
  placeholder?: string;
  emptyHint?: string;
  className?: string;
  disabled?: boolean;
  /** Max matches shown while typing (default 40). */
  maxResults?: number;
};

function matchesQuery(item: ChargeItemOption, q: string): boolean {
  if (!q) return true;
  const hay = `${item.label} ${item.secondary ?? ""} ${item.meta ?? ""}`.toLowerCase();
  return q.split(/\s+/).every((token) => hay.includes(token));
}

/**
 * Type-to-search picker for chargeable items (medicines, supplies, lab tests, etc.).
 * Filters a provided list in-memory — suitable for large catalogs without loading all into a dropdown.
 */
export function ChargeItemPicker({
  items,
  value,
  onSelect,
  placeholder = "Type to search…",
  emptyHint = "Type a name or code to search",
  className,
  disabled,
  maxResults = 40,
}: ChargeItemPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (value && value !== "none" ? items.find((i) => i.id === value) : undefined),
    [items, value]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matched: ChargeItemOption[] = [];
    for (const item of items) {
      if (!matchesQuery(item, q)) continue;
      matched.push(item);
      if (matched.length >= maxResults) break;
    }
    return matched;
  }, [items, query, maxResults]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const displayValue = open ? query : selected ? selected.label : query;

  const clear = () => {
    onSelect("", undefined);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={displayValue}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected) onSelect("", undefined);
          }}
          onFocus={() => {
            setOpen(true);
            if (selected && !query) setQuery(selected.label);
          }}
          placeholder={placeholder}
          className="h-9 pl-8 pr-8 text-xs"
          autoComplete="off"
        />
        {(selected || query) && !disabled && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={clear}
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {!query.trim() && (
            <p className="px-3 py-2 text-xs text-muted-foreground">{emptyHint}</p>
          )}
          {query.trim() && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches for “{query.trim()}”</p>
          )}
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted",
                selected?.id === item.id && "bg-muted/80"
              )}
              onClick={() => {
                onSelect(item.id, item);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{item.label}</span>
                {item.secondary ? (
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {item.secondary}
                  </span>
                ) : null}
              </span>
              {item.meta ? (
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                  {item.meta}
                </span>
              ) : null}
            </button>
          ))}
          {results.length >= maxResults && (
            <p className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
              Showing first {maxResults} matches — type more to narrow results
            </p>
          )}
        </div>
      )}
    </div>
  );
}
