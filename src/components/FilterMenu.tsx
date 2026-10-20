import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ListFilter } from "lucide-react";

// A compact "Filter" button with a dropdown of options and their counts, used next to the
// search box on staff lists (Members, Renewals). The first option is the unfiltered view.

interface FilterMenuProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ id: T; label: string; count?: number }>;
  onChange: (value: T) => void;
}

export function FilterMenu<T extends string>({ label, value, options, onChange }: FilterMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value) || options[0];
  const isFiltered = value !== options[0]?.id;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors cursor-pointer ${
          isFiltered ? "border-aqua-400 bg-aqua-400/10 text-ink-950" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
        }`}>
        <ListFilter className="h-4 w-4" />
        <span className={isFiltered ? "sm:hidden" : ""}>Filter</span>
        {isFiltered && <span className="hidden max-w-[11rem] truncate sm:inline">{current.label}</span>}
        {isFiltered && <span className="h-2 w-2 rounded-full bg-aqua-500 sm:hidden" aria-hidden="true" />}
        <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul role="listbox" aria-label={label}
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-ink-100 bg-white py-1.5 shadow-xl">
          {options.map((o) => {
            const selected = o.id === value;
            return (
              <li key={o.id}>
                <button type="button" role="option" aria-selected={selected} onClick={() => { onChange(o.id); setOpen(false); }}
                  className={`flex min-h-11 w-full items-center gap-3 px-3.5 text-left text-sm transition-colors cursor-pointer hover:bg-ink-50 ${selected ? "font-semibold text-ink-950" : "text-ink-700"}`}>
                  <Check className={`h-4 w-4 shrink-0 text-aqua-600 ${selected ? "" : "invisible"}`} />
                  <span className="flex-1">{o.label}</span>
                  {o.count !== undefined && <span className="text-xs font-medium text-ink-400">{o.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
