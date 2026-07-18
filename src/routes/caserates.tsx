import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Save, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { todayISO, type CaseRate } from "@/lib/store";
import { persistCaseRate, persistDeleteCaseRate } from "@/lib/services/caseRateCrudService";
import { searchCaseRatesApi } from "@/lib/services/caseRateApi";

export const Route = createFileRoute("/caserates")({
  head: () => ({ meta: [{ title: "Case Rates — Hospital CMS" }] }),
  component: CaseRatesPage,
});

const empty = (): CaseRate => ({
  id: "",
  code: "",
  description: "",
  amount: 0,
  category: "Medical",
  effectiveDate: todayISO(),
  healthFacilityFee: 0,
  professionalFeeAmount: 0,
  hospitalSharePct: 70,
  professionalFeePct: 30,
  active: true,
});

function CaseRatesPage() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [form, setForm] = useState<CaseRate>(empty());
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CaseRate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await searchCaseRatesApi({
        query: q,
        type: typeFilter,
        page,
        pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(Math.max(1, Math.ceil(result.total / pageSize)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load case rates");
    } finally {
      setLoading(false);
    }
  }, [q, typeFilter, page]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  useEffect(() => {
    setPage(1);
  }, [q, typeFilter]);

  const onAmountChange = (amount: number) => {
    const hfPct = form.hospitalSharePct ?? 70;
    const pfPct = form.professionalFeePct ?? 30;
    setForm({
      ...form,
      amount,
      healthFacilityFee: Math.round(amount * hfPct) / 100,
      professionalFeeAmount: Math.round(amount * pfPct) / 100,
    });
  };

  const save = async () => {
    if (!form.code || !form.description) return toast.error("Code and description required");
    try {
      const payload = editId ? { ...form, id: editId } : { ...form, id: "" };
      await persistCaseRate(payload);
      toast.success("Case rate saved to database");
      setEditId(null);
      setForm(empty());
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save case rate");
    }
  };

  const remove = async (id: string) => {
    try {
      await persistDeleteCaseRate(id);
      toast.success("Case rate removed from database");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete case rate");
    }
  };

  return (
    <div>
      <PageHeader
        title="Case Rates"
        description={`Official PhilHealth case rate catalog — ${total.toLocaleString()} codes in database (search loads pages only).`}
      />
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editId ? "Edit Case Rate" : "Add Case Rate"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-6">
              <div className="space-y-1.5">
                <Label className="text-xs">Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Case Type</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-9 border rounded px-2 text-sm"
                >
                  <option value="Medical">Medical</option>
                  <option value="Surgical">Surgical</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Case Rate (₱)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => onAmountChange(+e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective Date</Label>
                <Input
                  type="date"
                  value={form.effectiveDate || ""}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">HF Fee (₱)</Label>
                <Input
                  type="number"
                  value={form.healthFacilityFee ?? 0}
                  onChange={(e) => setForm({ ...form, healthFacilityFee: +e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PF Amount (₱)</Label>
                <Input
                  type="number"
                  value={form.professionalFeeAmount ?? 0}
                  onChange={(e) => setForm({ ...form, professionalFeeAmount: +e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hospital Share %</Label>
                <Input
                  type="number"
                  value={form.hospitalSharePct ?? 70}
                  onChange={(e) => setForm({ ...form, hospitalSharePct: +e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PF Share %</Label>
                <Input
                  type="number"
                  value={form.professionalFeePct ?? 30}
                  onChange={(e) => setForm({ ...form, professionalFeePct: +e.target.value })}
                />
              </div>
              <div className="md:col-span-6 flex justify-end gap-2">
                {editId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditId(null);
                      setForm(empty());
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button onClick={save}>
                  <Save className="h-4 w-4" /> {editId ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Case Rates</CardTitle>
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 border rounded px-2 text-xs"
                >
                  <option value="All">All types</option>
                  <option value="Medical">Medical</option>
                  <option value="Surgical">Surgical</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search code or description…"
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="text-right">Case Rate</TableHead>
                  <TableHead className="text-right">HF Fee</TableHead>
                  <TableHead className="text-right">PF</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No records found. Run: npm run db:seed
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell
                        className="font-medium text-xs max-w-[280px] truncate"
                        title={p.description}
                      >
                        {p.description}
                      </TableCell>
                      <TableCell className="text-xs">{p.category}</TableCell>
                      <TableCell className="text-xs">{p.effectiveDate || "N/A"}</TableCell>
                      <TableCell className="text-right text-xs">
                        ₱{p.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        ₱{(p.healthFacilityFee ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        ₱{(p.professionalFeeAmount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditId(p.id);
                            setForm(p);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ListPagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
