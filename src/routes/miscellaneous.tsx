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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChargeItemPicker } from "@/components/ChargeItemPicker";
import { PageHeader } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import { isPatientDischarged } from "@/lib/services/admissionService";
import { resolveLineItemPrice } from "@/lib/services/billingService";
import {
  deleteMiscellaneousRecord,
  ensureDefaultMiscFees,
  getMiscFeeItems,
  postMiscellaneousCharge,
} from "@/lib/services/miscellaneousService";
import { getActiveDoctors } from "@/lib/services/userService";
import { useStore, todayISO } from "@/lib/store";

export const Route = createFileRoute("/miscellaneous")({
  head: () => ({ meta: [{ title: "Miscellaneous — Hospital CMS" }] }),
  component: MiscellaneousPage,
});

function MiscellaneousPage() {
  const { state, setState } = useStore();
  const [patientId, setPatientId] = useState("");
  const [feeTypeId, setFeeTypeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [chargeDate, setChargeDate] = useState(todayISO());
  const [orderedBy, setOrderedBy] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setState((s) => ensureDefaultMiscFees(s));
  }, [setState]);

  const doctors = getActiveDoctors(state.users);
  const feeOptions = useMemo(
    () =>
      getMiscFeeItems(state).map((f) => ({
        id: f.id,
        label: f.description,
        secondary: f.code ? `Code ${f.code}` : "Miscellaneous",
        meta: f.caseRate > 0 ? `₱${f.caseRate.toLocaleString()}` : undefined,
      })),
    [state.prices, state.priceHistories],
  );
  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const records = state.miscellaneousRecords ?? [];
  const list = usePaginatedList(records, 50);
  const chargeBlocked = patientId ? isPatientDischarged(state, patientId) : false;

  const unitPrice = useMemo(() => {
    if (!feeTypeId) return 0;
    return resolveLineItemPrice(state, { priceItemId: feeTypeId, asOfDate: chargeDate });
  }, [state, feeTypeId, chargeDate]);

  const resetForm = () => {
    setFeeTypeId("");
    setQuantity(1);
    setChargeDate(todayISO());
    setNotes("");
  };

  const post = () => {
    if (!patientId) return toast.error("Select a patient");
    if (!feeTypeId) return toast.error("Search and select a fee type");
    if (chargeBlocked) return toast.error("Patient is discharged — cannot post charges");

    const result = postMiscellaneousCharge(state, {
      patientId,
      feeTypeId,
      quantity,
      chargeDate,
      orderedBy: orderedBy || undefined,
      notes: notes || undefined,
    });
    if ("error" in result) return toast.error(result.error);
    setState(() => result.state);
    toast.success(`Charge posted to bill ${result.record.billId ?? ""}`);
    resetForm();
  };

  const remove = (id: string) => {
    setState((s) => deleteMiscellaneousRecord(s, id));
    toast.success("Record removed");
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader
        title="Miscellaneous Charges"
        description="Post Delivery Room, Operating Room, and other miscellaneous fees to patient bills using as-of-date rates."
      />
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.4fr_1fr] items-stretch min-h-0 overflow-hidden">
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base">Charge History</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Patient</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No miscellaneous charges yet
                    </TableCell>
                  </TableRow>
                ) : (
                  list.pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 text-xs">
                        {patientMap.get(item.patientId)?.lastName ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{item.feeName}</TableCell>
                      <TableCell className="text-xs">{item.chargeDate}</TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        ₱{item.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.billId ?? "—"}</TableCell>
                      <TableCell className="text-right pr-4">
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
              page={list.page}
              totalPages={list.totalPages}
              totalItems={list.totalItems}
              onPageChange={list.setPage}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Post Miscellaneous Fee</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t">
            <PatientSearchWithHistory
              patients={state.patients}
              selectedPatientId={patientId}
              onSelect={setPatientId}
            />
            {chargeBlocked && (
              <p className="text-xs text-destructive">Patient is discharged — charging blocked.</p>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fee Type</Label>
              <ChargeItemPicker
                items={feeOptions}
                value={feeTypeId}
                onSelect={(id) => setFeeTypeId(id)}
                placeholder="Type to search fee type…"
                emptyHint="Type a fee name or code — catalog may have thousands of items"
              />
              {feeOptions.length === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Configure fee types in Settings → Miscellaneous.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Charge Date</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={chargeDate}
                  onChange={(e) => setChargeDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-9"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rate (as of charge date)</Label>
              <Input className="h-9" readOnly value={`₱${unitPrice.toFixed(2)}`} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Total</Label>
              <Input
                className="h-9 font-semibold"
                readOnly
                value={`₱${(unitPrice * quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ordered By (optional)</Label>
              <Select
                value={orderedBy || "none"}
                onValueChange={(v) => setOrderedBy(v === "none" ? "" : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.fullName}>
                      {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                className="min-h-[60px] text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={resetForm}>
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button size="sm" onClick={post} disabled={chargeBlocked}>
                <Save className="h-3.5 w-3.5" /> Post Charge
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
