import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { buildPatientMap } from "@/lib/stateIndexes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { deletePharmacyRecord, dispenseMedicine } from "@/lib/services/pharmacyService";
import { getActiveDoctors } from "@/lib/services/userService";
import { resolveLineItemPrice } from "@/lib/services/billingService";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/pharmacy")({
  head: () => ({ meta: [{ title: "Pharmacy — Hospital CMS" }] }),
  component: PharmacyPage,
});

function PharmacyPage() {
  const { state, setState } = useStore();
  const [patientId, setPatientId] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [prescribedBy, setPrescribedBy] = useState("");
  const [dispenseDate, setDispenseDate] = useState(new Date().toISOString().slice(0, 10));

  const doctors = getActiveDoctors(state.users);
  const medicineOptions = useMemo(
    () =>
      state.medicines
        .filter((m) => !m.archived && m.stock > 0 && (!m.category || m.category === "Medicine"))
        .map((m) => ({
          id: m.id,
          label: m.name,
          secondary: [m.unit, m.category || "Medicine"].filter(Boolean).join(" · "),
          meta: `stock ${m.stock}`,
        })),
    [state.medicines],
  );
  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const chargeBlocked = patientId ? isPatientDischarged(state, patientId) : false;
  const rxList = usePaginatedList(state.pharmacyRecords, 50);

  const unitPrice = useMemo(() => {
    if (!medicineId) return 0;
    return resolveLineItemPrice(state, { medicineId, asOfDate: dispenseDate });
  }, [state, medicineId, dispenseDate]);

  const dispense = () => {
    if (!patientId) return toast.error("Select a patient");
    if (!medicineId) return toast.error("Search and select a medicine");
    if (!prescribedBy) return toast.error("Prescribing provider is required");
    if (chargeBlocked) return toast.error("Patient is discharged — cannot dispense");

    const result = dispenseMedicine(state, {
      patientId,
      medicineId,
      quantity,
      prescribedBy,
      dispenseDate,
    });
    if ("error" in result) return toast.error(result.error);
    setState(() => result.state);
    toast.success(`Dispensed — charge posted to bill ${result.record.billId ?? ""}`);
    setMedicineId("");
    setQuantity(1);
  };

  const remove = (id: string) => {
    setState((s) => deletePharmacyRecord(s, id));
    toast.success("Record removed");
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader
        title="Pharmacy"
        description="Dispense medicines from inventory — stock deducted and charges posted at as-of-date prices."
      />
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.4fr_1fr] items-stretch min-h-0 overflow-hidden">
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base">Dispense Records</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Patient</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.pharmacyRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rxList.pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 text-xs">
                        {patientMap.get(item.patientId)?.lastName ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{item.medicine}</TableCell>
                      <TableCell className="text-xs">{item.quantity}</TableCell>
                      <TableCell className="text-xs">₱{(item.unitPrice ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{item.dispenseDate}</TableCell>
                      <TableCell className="text-xs">
                        ₱{(item.totalAmount ?? 0).toLocaleString()}
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
              page={rxList.page}
              totalPages={rxList.totalPages}
              totalItems={rxList.totalItems}
              onPageChange={rxList.setPage}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Dispense Medicine</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t">
            <PatientSearchWithHistory
              patients={state.patients}
              selectedPatientId={patientId}
              onSelect={setPatientId}
            />
            {chargeBlocked && (
              <p className="text-xs text-destructive">
                Patient is discharged — dispensing blocked.
              </p>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Medicine (Inventory)</Label>
              <ChargeItemPicker
                items={medicineOptions}
                value={medicineId}
                onSelect={(id) => setMedicineId(id)}
                placeholder="Type to search medicine (e.g. paracetamol)…"
                emptyHint="Type a medicine name — catalog may have thousands of items"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-9"
                  value={quantity}
                  onChange={(e) => setQuantity(+e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Unit Price (as of date)</Label>
                <Input className="h-9" readOnly value={`₱${unitPrice.toFixed(2)}`} />
              </div>
            </div>
            {medicineId && (
              <p className="text-[11px] text-muted-foreground">
                Price as of {dispenseDate}
                {unitPrice <= 0 ? " — no effective price found" : ""}
              </p>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Total</Label>
              <Input
                className="h-9 font-semibold"
                readOnly
                value={`₱${(unitPrice * quantity).toFixed(2)}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prescribed By</Label>
              <Select value={prescribedBy} onValueChange={setPrescribedBy}>
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
              <Label className="text-xs text-muted-foreground">Dispense Date</Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={dispenseDate}
                onChange={(e) => setDispenseDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPatientId("");
                  setMedicineId("none");
                  setQuantity(1);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button size="sm" onClick={dispense} disabled={chargeBlocked}>
                <Save className="h-3.5 w-3.5" /> Dispense & Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
