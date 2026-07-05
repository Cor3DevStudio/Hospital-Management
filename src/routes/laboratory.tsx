import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { buildPatientMap } from "@/lib/stateIndexes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChargeItemPicker } from "@/components/ChargeItemPicker";
import { PageHeader } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import {
  createLabOrder,
  deleteLabRecord,
  emptyLabRecord,
  ensureDefaultLabPrices,
  getLabPriceItems,
  updateLabRecord,
} from "@/lib/services/laboratoryService";
import { getActiveDoctors } from "@/lib/services/userService";
import { resolveLineItemPrice } from "@/lib/services/billingService";
import { useStore, type LaboratoryRecord } from "@/lib/store";

export const Route = createFileRoute("/laboratory")({
  head: () => ({ meta: [{ title: "Laboratory — Hospital CMS" }] }),
  component: LaboratoryPage,
});

function LaboratoryPage() {
  const { state, setState } = useStore();
  const [form, setForm] = useState<LaboratoryRecord>(emptyLabRecord());
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    setState((s) => ensureDefaultLabPrices(s));
  }, [setState]);

  const doctors = getActiveDoctors(state.users);
  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const labList = usePaginatedList(state.laboratoryRecords, 50);
  const labOptions = useMemo(
    () =>
      getLabPriceItems(state).map((p) => ({
          id: p.id,
          label: p.description,
          secondary: p.code ? `Code ${p.code}` : "Laboratory",
          meta: p.caseRate > 0 ? `₱${p.caseRate.toLocaleString()}` : undefined,
        })),
    [state.prices, state.priceHistories]
  );

  const unitPrice = useMemo(() => {
    if (!form.priceItemId) return 0;
    return resolveLineItemPrice(state, {
      priceItemId: form.priceItemId,
      asOfDate: form.requestDate,
    });
  }, [state, form.priceItemId, form.requestDate]);

  const quantity = form.quantity && form.quantity > 0 ? form.quantity : 1;

  const reset = () => {
    setEditId(null);
    setForm(emptyLabRecord());
  };

  const save = () => {
    if (!form.patientId || !form.testName || !form.requestDate || !form.requestedBy) {
      return toast.error("Patient, test, date, and ordering doctor are required");
    }

    if (editId) {
      setState((s) => updateLabRecord(s, { ...form, id: editId }));
      toast.success("Lab record updated");
      reset();
      return;
    }

    if (!form.priceItemId) {
      return toast.error("Search and select a lab test from Hospital Prices");
    }

    let createdBillId: string | undefined;
    let errorMessage: string | null = null;

    setState((current) => {
      const result = createLabOrder(current, { ...form, quantity }, true);
      if ("error" in result) {
        errorMessage = result.error;
        return current;
      }
      createdBillId = result.record.billId;
      return result.state;
    });

    if (errorMessage) return toast.error(errorMessage);

    toast.success(
      createdBillId
        ? `Lab order created — billed on ${createdBillId}`
        : "Lab order created"
    );
    reset();
  };

  const remove = (id: string) => {
    setState((s) => deleteLabRecord(s, id));
    toast.success("Lab record deleted");
    if (editId === id) reset();
  };

  const onSelectTest = (priceId: string) => {
    if (!priceId) {
      setForm({ ...form, priceItemId: undefined, testName: "" });
      return;
    }
    const item = state.prices.find((p) => p.id === priceId);
    if (item) setForm({ ...form, priceItemId: priceId, testName: item.description });
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader
        title="Laboratory"
        description="Create lab orders from Hospital Prices — charges post at as-of-date prices (no inventory deduction)."
      />
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.4fr_1fr] items-stretch min-h-0 overflow-hidden">
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base">Lab Orders</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.laboratoryRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  labList.pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 text-xs">
                        {patientMap.get(item.patientId)?.lastName ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{item.testName}</TableCell>
                      <TableCell className="text-xs">{item.requestDate}</TableCell>
                      <TableCell className="text-xs">
                        ₱{(item.totalAmount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.billId ?? "—"}</TableCell>
                      <TableCell className="text-xs">{item.status}</TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditId(item.id);
                            setForm(item);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => remove(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ListPagination
              page={labList.page}
              totalPages={labList.totalPages}
              totalItems={labList.totalItems}
              onPageChange={labList.setPage}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">{editId ? "Edit Lab Order" : "New Lab Order"}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t">
            <PatientSearchWithHistory
              patients={state.patients}
              selectedPatientId={form.patientId}
              onSelect={(id) => setForm({ ...form, patientId: id })}
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Test (Hospital Prices)</Label>
              <ChargeItemPicker
                items={labOptions}
                value={form.priceItemId}
                onSelect={onSelectTest}
                placeholder="Type to search lab test…"
                emptyHint="Type a test name or code — catalog may have thousands of items"
                disabled={!!editId}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Test Name</Label>
              <Input
                className="h-9 text-sm"
                value={form.testName}
                onChange={(e) => setForm({ ...form, testName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date Ordered</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={form.requestDate}
                  onChange={(e) => setForm({ ...form, requestDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-9"
                  value={quantity}
                  onChange={(e) => setForm({ ...form, quantity: +e.target.value })}
                  disabled={Boolean(editId)}
                />
              </div>
            </div>
            {!editId && form.priceItemId && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit Price (as of date)</Label>
                  <Input className="h-9" readOnly value={`₱${unitPrice.toFixed(2)}`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <Input
                    className="h-9 font-semibold"
                    readOnly
                    value={`₱${(unitPrice * quantity).toFixed(2)}`}
                  />
                </div>
              </div>
            )}
            {!editId && form.priceItemId && (
              <p className="text-[11px] text-muted-foreground">
                Price as of {form.requestDate}
                {unitPrice <= 0 ? " — no effective price found" : ""}
              </p>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as LaboratoryRecord["status"] })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Pending", "In Progress", "Completed", "Cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ordering Doctor</Label>
              <Select
                value={form.requestedBy}
                onValueChange={(v) => setForm({ ...form, requestedBy: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.fullName}>
                      {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Result Value / Notes</Label>
              <Textarea
                className="min-h-[70px] text-sm"
                value={form.resultValue || form.resultSummary || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    resultValue: e.target.value,
                    resultSummary: e.target.value,
                    resultDate:
                      form.status === "Completed"
                        ? new Date().toISOString().slice(0, 10)
                        : form.resultDate,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button size="sm" onClick={save}>
                <Save className="h-3.5 w-3.5" /> {editId ? "Update" : "Charge & Bill"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
