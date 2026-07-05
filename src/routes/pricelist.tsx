import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList, useResetPageOnChange } from "@/lib/hooks/usePaginatedList";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import {
  createPriceItem,
  deletePriceItem,
  filterPriceItems,
  PRICE_CATEGORIES,
  updatePriceItem,
} from "@/lib/services/priceListService";
import { getPriceHistoryForItem } from "@/lib/priceService";
import {
  persistCaseRate,
  persistDeleteCaseRate,
} from "@/lib/services/caseRateCrudService";
import { searchCaseRatesApi } from "@/lib/services/caseRateApi";
import { useStore, todayISO, type CaseRate, type PriceItem } from "@/lib/store";

export const Route = createFileRoute("/pricelist")({
  head: () => ({ meta: [{ title: "PhilHealth Case Rates — Hospital CMS" }] }),
  component: PriceListPage,
});

const emptyPrice = (): PriceItem => ({
  id: "",
  code: "",
  description: "",
  caseRate: 0,
  category: "Medicine",
  effectiveDate: todayISO(),
});

const emptyCaseRate = (): CaseRate => ({
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

function PriceListPage() {
  const { state, setState } = useStore();
  const [tab, setTab] = useState("clinic");

  // --- Hospital prices ---
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [form, setForm] = useState<PriceItem>(emptyPrice());
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterPriceItems(state.prices, { query: q, category: categoryFilter }),
    [state.prices, q, categoryFilter]
  );

  const priceList = usePaginatedList(filtered, 50);
  useResetPageOnChange(priceList.resetPage, [q, categoryFilter]);

  const priceHistory = editId ? getPriceHistoryForItem(state, "priceItem", editId) : [];

  const savePrice = () => {
    if (!form.code || !form.description) return toast.error("Code and description required");
    if (editId) {
      setState((s) => updatePriceItem(s, { ...form, id: editId }));
    } else {
      setState((s) => createPriceItem(s, form));
    }
    toast.success("Price entry saved");
    setEditId(null);
    setForm(emptyPrice());
  };

  const removePrice = (id: string) => {
    setState((s) => deletePriceItem(s, id));
    toast.success("Entry removed");
    if (editId === id) {
      setEditId(null);
      setForm(emptyPrice());
    }
  };

  // --- PhilHealth case rates (DB-backed) ---
  const [crQ, setCrQ] = useState("");
  const [crType, setCrType] = useState("All");
  const [crForm, setCrForm] = useState<CaseRate>(emptyCaseRate());
  const [crEditId, setCrEditId] = useState<string | null>(null);
  const [crPage, setCrPage] = useState(1);
  const [crItems, setCrItems] = useState<CaseRate[]>([]);
  const [crTotal, setCrTotal] = useState(0);
  const [crTotalPages, setCrTotalPages] = useState(1);
  const [crLoading, setCrLoading] = useState(false);
  const crPageSize = 50;

  const loadCaseRates = useCallback(async () => {
    setCrLoading(true);
    try {
      const result = await searchCaseRatesApi({
        query: crQ,
        type: crType,
        page: crPage,
        pageSize: crPageSize,
      });
      setCrItems(result.items);
      setCrTotal(result.total);
      setCrTotalPages(Math.max(1, Math.ceil(result.total / crPageSize)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load case rates");
    } finally {
      setCrLoading(false);
    }
  }, [crQ, crType, crPage]);

  useEffect(() => {
    if (tab !== "caserates") return;
    const timer = setTimeout(loadCaseRates, crQ ? 250 : 0);
    return () => clearTimeout(timer);
  }, [tab, loadCaseRates, crQ]);

  useEffect(() => {
    setCrPage(1);
  }, [crQ, crType]);

  const onCaseRateAmountChange = (amount: number) => {
    const hfPct = crForm.hospitalSharePct ?? 70;
    const pfPct = crForm.professionalFeePct ?? 30;
    setCrForm({
      ...crForm,
      amount,
      healthFacilityFee: Math.round((amount * hfPct) / 100 * 100) / 100,
      professionalFeeAmount: Math.round((amount * pfPct) / 100 * 100) / 100,
    });
  };

  const saveCaseRate = async () => {
    if (!crForm.code || !crForm.description) return toast.error("Code and description required");
    try {
      const payload = crEditId ? { ...crForm, id: crEditId } : { ...crForm, id: "" };
      await persistCaseRate(payload);
      toast.success("PhilHealth case rate saved to database");
      setCrEditId(null);
      setCrForm(emptyCaseRate());
      await loadCaseRates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save case rate");
    }
  };

  const removeCaseRate = async (id: string) => {
    try {
      await persistDeleteCaseRate(id);
      toast.success("Case rate removed");
      if (crEditId === id) {
        setCrEditId(null);
        setCrForm(emptyCaseRate());
      }
      await loadCaseRates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete case rate");
    }
  };

  return (
    <div>
      <PageHeader
        title="PhilHealth Case Rates"
        description="Hospital charges and PhilHealth case rates — edit amounts, add new codes, and keep billing consistent."
      />
      <div className="space-y-4 p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2">
            <TabsTrigger value="clinic" className="text-xs">
              Hospital Prices
            </TabsTrigger>
            <TabsTrigger value="caserates" className="text-xs">
              PhilHealth Case Rates
            </TabsTrigger>
          </TabsList>

          {/* -------- Hospital prices -------- */}
          <TabsContent value="clinic" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editId ? "Edit Price Entry" : "Add Price Entry"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Code</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount (₱)</Label>
                    <Input
                      type="number"
                      value={form.caseRate}
                      onChange={(e) => setForm({ ...form, caseRate: +e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">As-of Date</Label>
                    <Input
                      type="date"
                      value={form.effectiveDate || ""}
                      onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                    />
                  </div>
                  {priceHistory.length > 0 && (
                    <div className="md:col-span-6 rounded-md border p-3 text-xs">
                      <p className="font-medium mb-2">Price history</p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {priceHistory.map((h) => (
                          <div key={h.id} className="flex justify-between gap-2">
                            <span>{h.effectiveDate}</span>
                            <span>₱{h.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-6 flex justify-end gap-2">
                    {editId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditId(null);
                          setForm(emptyPrice());
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button onClick={savePrice}>
                      <Save className="h-4 w-4" /> {editId ? "Update" : "Add"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">Price Entries</CardTitle>
                  <div className="flex gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[150px] h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All categories</SelectItem>
                        {PRICE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search…"
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
                      <TableHead>Category</TableHead>
                      <TableHead>As-of Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          No records yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      priceList.pageItems.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.code}</TableCell>
                          <TableCell className="font-medium">{p.description}</TableCell>
                          <TableCell>{p.category}</TableCell>
                          <TableCell className="text-xs">{p.effectiveDate || "N/A"}</TableCell>
                          <TableCell className="text-right">₱{p.caseRate.toLocaleString()}</TableCell>
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
                            <Button size="sm" variant="ghost" onClick={() => removePrice(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ListPagination
                  page={priceList.page}
                  totalPages={priceList.totalPages}
                  totalItems={priceList.totalItems}
                  onPageChange={priceList.setPage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- PhilHealth case rates -------- */}
          <TabsContent value="caserates" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {crEditId ? "Edit Case Rate" : "Add Case Rate"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Official PhilHealth case rate catalog — changes save to the database and apply in
                  Billing / PhilHealth.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Code</Label>
                    <Input
                      value={crForm.code}
                      onChange={(e) => setCrForm({ ...crForm, code: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={crForm.description}
                      onChange={(e) => setCrForm({ ...crForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Case Type</Label>
                    <Select
                      value={crForm.category}
                      onValueChange={(v) => setCrForm({ ...crForm, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Surgical">Surgical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Case Rate (₱)</Label>
                    <Input
                      type="number"
                      value={crForm.amount}
                      onChange={(e) => onCaseRateAmountChange(+e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Effective Date</Label>
                    <Input
                      type="date"
                      value={crForm.effectiveDate || ""}
                      onChange={(e) => setCrForm({ ...crForm, effectiveDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">HF Fee (₱)</Label>
                    <Input
                      type="number"
                      value={crForm.healthFacilityFee ?? 0}
                      onChange={(e) =>
                        setCrForm({ ...crForm, healthFacilityFee: +e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">PF Amount (₱)</Label>
                    <Input
                      type="number"
                      value={crForm.professionalFeeAmount ?? 0}
                      onChange={(e) =>
                        setCrForm({ ...crForm, professionalFeeAmount: +e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hospital Share %</Label>
                    <Input
                      type="number"
                      value={crForm.hospitalSharePct ?? 70}
                      onChange={(e) =>
                        setCrForm({ ...crForm, hospitalSharePct: +e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">PF Share %</Label>
                    <Input
                      type="number"
                      value={crForm.professionalFeePct ?? 30}
                      onChange={(e) =>
                        setCrForm({ ...crForm, professionalFeePct: +e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-6 flex justify-end gap-2">
                    {crEditId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCrEditId(null);
                          setCrForm(emptyCaseRate());
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button onClick={saveCaseRate}>
                      <Save className="h-4 w-4" /> {crEditId ? "Update" : "Add"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    Case Rates{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({crTotal.toLocaleString()} in database)
                    </span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Select value={crType} onValueChange={setCrType}>
                      <SelectTrigger className="w-[140px] h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All types</SelectItem>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Surgical">Surgical</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={crQ}
                        onChange={(e) => setCrQ(e.target.value)}
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
                    {crLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : crItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          No case rates found. Run: npm run db:seed
                        </TableCell>
                      </TableRow>
                    ) : (
                      crItems.map((p) => (
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
                                setCrEditId(p.id);
                                setCrForm(p);
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => removeCaseRate(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ListPagination
                  page={crPage}
                  totalPages={crTotalPages}
                  totalItems={crTotal}
                  onPageChange={setCrPage}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
