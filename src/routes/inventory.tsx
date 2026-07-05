import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, Trash2, AlertTriangle, Search, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList, useResetPageOnChange } from "@/lib/hooks/usePaginatedList";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatChip } from "@/components/PageHeader";
import {
  adjustMedicineStock,
  archiveMedicine,
  createMedicine,
  deleteMedicine,
  filterInventory,
  getExpiringSoonItems,
  getLowStockItems,
  INVENTORY_CATEGORIES,
  isExpiringSoon,
  isLowStock,
  restoreMedicine,
  updateMedicine,
} from "@/lib/services/inventoryService";
import { getPriceHistoryForItem } from "@/lib/priceService";
import { useStore, todayISO, type Medicine } from "@/lib/store";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Hospital CMS" }] }),
  component: InventoryPage,
});

const empty = (): Medicine => ({
  id: "",
  name: "",
  category: "Medicine",
  stock: 0,
  unit: "pcs",
  reorderLevel: 0,
  unitPrice: 0,
  priceEffectiveDate: todayISO(),
  expiry: "",
  archived: false,
});

function InventoryPage() {
  const { state, setState } = useStore();
  const [form, setForm] = useState<Medicine>(empty());
  const [editId, setEditId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showArchived, setShowArchived] = useState(false);

  const lowStock = getLowStockItems(state.medicines);
  const expiringSoon = getExpiringSoonItems(state.medicines);
  const totalValue = state.medicines
    .filter((m) => !m.archived)
    .reduce((s, m) => s + m.stock * m.unitPrice, 0);

  const filtered = useMemo(
    () => filterInventory(state.medicines, { query, category: categoryFilter, showArchived }),
    [state.medicines, query, categoryFilter, showArchived]
  );

  const itemList = usePaginatedList(filtered, 50);
  useResetPageOnChange(itemList.resetPage, [query, categoryFilter, showArchived]);

  const priceHistory = editId
    ? getPriceHistoryForItem(state, "medicine", editId)
    : [];

  const save = () => {
    if (!form.name) return toast.error("Item name is required");
    if (editId) {
      setState((s) => updateMedicine(s, { ...form, id: editId }));
      toast.success("Item updated");
    } else {
      setState((s) => createMedicine(s, form));
      toast.success("Item added");
    }
    setEditId(null);
    setForm(empty());
  };

  const remove = (id: string) => {
    setState((s) => deleteMedicine(s, id));
    toast.success("Item removed");
    if (editId === id) {
      setEditId(null);
      setForm(empty());
    }
  };

  const archive = (id: string) => {
    setState((s) => archiveMedicine(s, id));
    toast.success("Item archived");
  };

  const restore = (id: string) => {
    setState((s) => restoreMedicine(s, id));
    toast.success("Item restored");
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader title="Inventory" description="Pharmacy stock, reorder alerts, and expiry tracking." />

      <div className="px-4 pt-4 shrink-0 flex flex-wrap gap-2">
        <StatChip label="SKUs" value={state.medicines.filter((m) => !m.archived).length} />
        <StatChip label="Low Stock" value={lowStock.length} tone={lowStock.length ? "destructive" : "success"} />
        <StatChip label="Expiring Soon" value={expiringSoon.length} tone={expiringSoon.length ? "warning" : "success"} />
        <StatChip label="Inventory Value" value={`₱${totalValue.toLocaleString()}`} tone="info" />
      </div>

      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.5fr_1fr] lg:grid-cols-[1.8fr_1fr] items-stretch min-h-0 overflow-hidden">
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4 space-y-3">
            <CardTitle className="text-base">Inventory Items</CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search items…"
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All categories</SelectItem>
                  {INVENTORY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={showArchived ? "secondary" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setShowArchived((v) => !v)}
              >
                <Archive className="h-3.5 w-3.5 mr-1" />
                {showArchived ? "Archived" : "Active"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  itemList.pageItems.map((m) => {
                    const low = isLowStock(m);
                    const expiring = isExpiringSoon(m);
                    return (
                      <TableRow key={m.id} className={m.archived ? "opacity-60" : ""}>
                        <TableCell className="font-medium pl-4 text-xs sm:text-sm">{m.name}</TableCell>
                        <TableCell className="text-xs">{m.category}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm">
                          <span className={low ? "text-destructive font-semibold" : ""}>{m.stock}</span>
                          {low && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-destructive align-text-bottom" />}
                        </TableCell>
                        <TableCell className="text-xs">{m.unit || "pcs"}</TableCell>
                        <TableCell className="text-right text-xs">{m.reorderLevel}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm">₱{m.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">
                          {m.expiry ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-normal px-1 py-0 ${expiring ? "border-warning-foreground text-warning-foreground" : ""}`}
                            >
                              {m.expiry}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {!m.archived && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 px-1.5 text-[10px]" onClick={() => setState((s) => adjustMedicineStock(s, m.id, 10))}>+10</Button>
                                <Button size="sm" variant="outline" className="h-7 px-1.5 text-[10px]" onClick={() => setState((s) => adjustMedicineStock(s, m.id, -1))}>-1</Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditId(m.id); setForm(m); }}>Edit</Button>
                            {m.archived ? (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => restore(m.id)} title="Restore"><RotateCcw className="h-3.5 w-3.5" /></Button>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => archive(m.id)} title="Archive"><Archive className="h-3.5 w-3.5" /></Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <ListPagination page={itemList.page} totalPages={itemList.totalPages} totalItems={itemList.totalItems} onPageChange={itemList.setPage} />
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">{editId ? "Edit Item" : "Add Item"}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t flex flex-col">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Item Name</Label>
                <Input className="h-9 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INVENTORY_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <Input className="h-9 text-sm" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs, box, vial" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quantity on Hand</Label>
                  <Input className="h-9" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Reorder Level</Label>
                  <Input className="h-9" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: +e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Link to Hospital Prices (optional)</Label>
                <Select
                  value={form.priceItemId ?? "none"}
                  onValueChange={(v) => setForm({ ...form, priceItemId: v === "none" ? undefined : v })}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Manual pricing" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manual unit cost</SelectItem>
                    {state.prices.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.code} — {p.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit Cost</Label>
                  <Input className="h-9" type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: +e.target.value })} disabled={!!form.priceItemId} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">As-of Date</Label>
                  <Input className="h-9 text-xs" type="date" value={form.priceEffectiveDate || todayISO()} onChange={(e) => setForm({ ...form, priceEffectiveDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                  <Input className="h-9 text-xs" type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
                </div>
              </div>
              {priceHistory.length > 0 && (
                <div className="rounded-md border p-2 text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">Price history</p>
                  {priceHistory.slice(0, 5).map((h) => (
                    <div key={h.id} className="flex justify-between">
                      <span>{h.effectiveDate}</span>
                      <span>₱{h.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-3 mt-auto shrink-0">
              {editId && <Button variant="outline" size="sm" onClick={() => { setEditId(null); setForm(empty()); }}>Cancel</Button>}
              <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5" /> {editId ? "Update" : "Add"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
