import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALL_PAGE_PATHS, APP_PAGES, PAGE_GROUPS, normalizePageAccess } from "@/lib/pageAccess";
import type { User } from "@/lib/store";

type PageAccessModalProps = {
  open: boolean;
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onSave: (pageAccess: string[]) => void | Promise<void>;
  saving?: boolean;
};

export function PageAccessModal({
  open,
  user,
  onOpenChange,
  onSave,
  saving = false,
}: PageAccessModalProps) {
  const isAdmin = user?.role === "Administrator";
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    setSelected(isAdmin ? [...ALL_PAGE_PATHS] : normalizePageAccess(user.pageAccess));
  }, [open, user, isAdmin]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (path: string) => {
    if (isAdmin) return;
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  };

  const selectAll = () => setSelected([...ALL_PAGE_PATHS]);
  const clearAll = () => setSelected([]);

  const handleSave = async () => {
    if (!user || isAdmin) {
      onOpenChange(false);
      return;
    }
    if (selected.length === 0) return;
    await onSave(normalizePageAccess(selected));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,720px)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 pr-12 text-left">
          <DialogTitle className="text-base">Page Access</DialogTitle>
          <DialogDescription className="text-xs">
            {user
              ? `Choose which pages ${user.fullName} (${user.username}) can open.`
              : "Choose which pages this user can open."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
          <p className="text-[11px] text-muted-foreground">
            {selected.length} of {ALL_PAGE_PATHS.length} selected
          </p>
          {!isAdmin && (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={selectAll}
              >
                <CheckSquare className="mr-1 h-3.5 w-3.5" />
                All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearAll}
              >
                <Square className="mr-1 h-3.5 w-3.5" />
                None
              </Button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {isAdmin && (
            <p className="mb-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Administrators always have access to every page.
            </p>
          )}
          <div className="space-y-4">
            {PAGE_GROUPS.map((group) => {
              const pages = APP_PAGES.filter((p) => p.group === group);
              return (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  <ul className="space-y-1.5">
                    {pages.map((page) => {
                      const checked = selectedSet.has(page.path);
                      return (
                        <li key={page.path}>
                          <label
                            className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60 ${
                              checked ? "border-primary/30 bg-muted/40" : "border-transparent"
                            } ${isAdmin ? "cursor-default opacity-90" : ""}`}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={isAdmin}
                              onCheckedChange={() => toggle(page.path)}
                            />
                            <span className="min-w-0 flex-1 font-medium">{page.title}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-3 sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || isAdmin || selected.length === 0}
          >
            {saving ? "Saving…" : "Save Access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
