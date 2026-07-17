import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { User } from "@/lib/store";

type DoctorSearchPickerProps = {
  doctors: User[];
  value: string;
  onSelect: (fullName: string) => void;
  placeholder?: string;
  className?: string;
};

/** Search-as-you-type picker for selecting a doctor by name from the active roster. */
export function DoctorSearchPicker({
  doctors,
  value,
  onSelect,
  placeholder = "Search doctor's name…",
  className,
}: DoctorSearchPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? doctors.filter((d) => d.fullName.toLowerCase().includes(q))
    : doctors;

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={open ? query : value || query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (value && !query) setQuery(value);
          }}
          placeholder={placeholder}
          className="pl-8 h-9 text-xs"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {doctors.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No doctors in system</p>
          )}
          {doctors.length > 0 && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
          )}
          {results.map((d) => (
            <button
              key={d.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
              onClick={() => {
                onSelect(d.fullName);
                setQuery("");
                setOpen(false);
              }}
            >
              {d.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
