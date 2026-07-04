import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { searchCaseRatesApi } from "@/lib/services/caseRateApi";
import type { CaseRate } from "@/lib/store";

type CaseRatePickerProps = {
  value?: string;
  amount?: number;
  onSelect: (code: string, amount: number, rate?: CaseRate) => void;
  placeholder?: string;
  className?: string;
};

/**
 * Search-as-you-type picker for PhilHealth case rates.
 * Queries MariaDB via API — never loads the full catalog into memory.
 */
export function CaseRatePicker({
  value,
  amount,
  onSelect,
  placeholder = "Search case code or description…",
  className,
}: CaseRatePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CaseRate[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchCaseRatesApi({ query: q, pageSize: 20 });
        setResults(result.items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, open]);

  const label =
    value && value !== "none"
      ? `${value}${amount != null ? ` — ₱${amount.toLocaleString()}` : ""}`
      : "";

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={open ? query : label || query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (value && value !== "none" && !query) setQuery(value);
          }}
          placeholder={placeholder}
          className="pl-8 h-9 text-xs"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
            onClick={() => {
              onSelect("none", 0);
              setQuery("");
              setOpen(false);
            }}
          >
            — None —
          </button>
          {loading && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onSelect(r.code, r.amount, r);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="font-mono font-semibold">{r.code}</span>
                <span className="text-muted-foreground"> — {r.description}</span>
                <span className="float-right font-medium">₱{r.amount.toLocaleString()}</span>
              </button>
            ))}
          {!query.trim() && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Type a code or diagnosis to search the PhilHealth catalog
            </p>
          )}
        </div>
      )}
    </div>
  );
}
