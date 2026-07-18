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
import { deleteSuppliesRecord, issueSupply } from "@/lib/services/suppliesService";
import { getActiveDoctors } from "@/lib/services/userService";
import { resolveLineItemPrice } from "@/lib/services/billingService";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/supplies")({
  head: () => ({ meta: [{ title: "Supplies — Hospital CMS" }] }),
  component: SuppliesPage,
});

function SuppliesPage() {
  const { state, setState } = useStore();
  const [patientId, setPatientId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [issuedBy, setIssuedBy] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));

  const doctors = getActiveDoctors(state.users);
  const supplyOptions = useMemo(
    () =>
      state.medicines
        .filter((m) => !m.archived && m.stock > 0 && m.category === "Supplies")
        .map((m) => ({
          id: m.id,
          label: m.name,
          secondary: [m.unit, "Supplies"].filter(Boolean).join(" · "),
          meta: `stock ${m.stock}`,
        })),
    [state.medicines],
  );
  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const records = state.suppliesRecords ?? [];
  const chargeBlocked = patientId ? isPatientDischarged(state, patientId) : false;
  const list = usePaginatedList(records, 50);

  const unitPrice = useMemo(() => {
    if (!itemId) return 0;
    return resolveLineItemPrice(state, { medicineId: itemId, asOfDate: issueDate });
  }, [state, itemId, issueDate]);

  const issue = () => {
    if (!patientId) return toast.error("Select a patient");
    if (!itemId) return toast.error("Search and select a supply item");
    if (chargeBlocked) return toast.error("Patient is discharged — cannot issue supplies");

    const result = issueSupply(state, {
      patientId,
      medicineId: itemId,
      quantity,
      issuedBy: issuedBy || undefined,
      issueDate,
    });
    if ("error" in result) return toast.error(result.error);
    setState(() => result.state);
    toast.success(`Issued — charge posted to bill ${result.record.billId ?? ""}`);
    setItemId("");
    setQuantity(1);
  };

  const remove = (id: string) => {
    setState((s) => deleteSuppliesRecord(s, id));
    toast.success("Record removed");
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader
        title="Supplies"
        description="Issue medical supplies from inventory — stock deducted and charges posted at as-of-date prices."
      />
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.4fr_1fr] items-stretch min-h-0 overflow-hidden">
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base">Issue Records</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Patient</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  list.pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 text-xs">
                        {patientMap.get(item.patientId)?.lastName ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{item.itemName}</TableCell>
                      <TableCell className="text-xs">{item.quantity}</TableCell>
                      <TableCell className="text-xs">₱{(item.unitPrice ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{item.issueDate}</TableCell>
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
              page={list.page}
              totalPages={list.totalPages}
              totalItems={list.totalItems}
              onPageChange={list.setPage}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">Issue Supply</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t">
            <PatientSearchWithHistory
              patients={state.patients}
              selectedPatientId={patientId}
              onSelect={setPatientId}
            />
            {chargeBlocked && (
              <p className="text-xs text-destructive">Patient is discharged — issuing blocked.</p>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Supply Item (Inventory)</Label>
              <ChargeItemPicker
                items={supplyOptions}
                value={itemId}
                onSelect={(id) => setItemId(id)}
                placeholder="Type to search supply…"
                emptyHint="Type a supply name — catalog may have thousands of items"
              />
              {supplyOptions.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No supplies in stock. Add items with category Supplies in Inventory.
                </p>
              )}
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
            {itemId && (
              <p className="text-[11px] text-muted-foreground">
                Price as of {issueDate}
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
              <Label className="text-xs text-muted-foreground">Issued By (optional)</Label>
              <Select
                value={issuedBy || "none"}
                onValueChange={(v) => setIssuedBy(v === "none" ? "" : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.fullName}>
                      {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Issue Date</Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPatientId("");
                  setItemId("none");
                  setQuantity(1);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button size="sm" onClick={issue} disabled={chargeBlocked}>
                <Save className="h-3.5 w-3.5" /> Issue & Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
