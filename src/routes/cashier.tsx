import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { buildPatientMap } from "@/lib/stateIndexes";
import { invalidateDashboardMetricsCache } from "@/lib/hooks/useDashboardMetrics";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatChip } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import { computeBillBalance } from "@/lib/services/billingService";
import {
  deleteCashierTransaction,
  getPatientOpenBills,
  getRevenueForDate,
  processBillPayment,
} from "@/lib/services/cashierService";
import { syncEClaimFromBill } from "@/lib/services/eclaimService";
import { useStore, todayISO } from "@/lib/store";

export const Route = createFileRoute("/cashier")({
  head: () => ({ meta: [{ title: "Cashier — Hospital CMS" }] }),
  component: CashierPage,
});

function CashierPage() {
  const { state, setState } = useStore();
  const [patientId, setPatientId] = useState("");
  const [billId, setBillId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "GCash" | "Insurance" | "Credit">("Cash");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayISO());

  const openBills = useMemo(() => (patientId ? getPatientOpenBills(state, patientId) : []), [state, patientId]);
  const selectedBill = state.bills.find((b) => b.id === billId);
  const balance = selectedBill ? computeBillBalance(selectedBill) : 0;
  const todayTotal = getRevenueForDate(state, todayISO());
  const patients = state.patients.filter((p) => !p.archived);
  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const reversedTx = useMemo(() => [...state.cashierTransactions].reverse(), [state.cashierTransactions]);
  const txList = usePaginatedList(reversedTx, 50);

  const pay = () => {
    if (!billId) return toast.error("Select a bill");
    const payVal = parseFloat(amount) || 0;
    if (payVal <= 0) return toast.error("Enter payment amount");

    const result = processBillPayment(state, {
      billId,
      amount: payVal,
      paymentMethod,
      receiptNumber: receiptNumber || `OR-${Date.now().toString().slice(-6)}`,
      transactionDate,
    });
    if ("error" in result) return toast.error(result.error);

    let next = result.state;
    const updatedBill = next.bills.find((b) => b.id === billId);
    if (updatedBill?.dischargeDate) next = syncEClaimFromBill(next, updatedBill);

    setState(next);
    invalidateDashboardMetricsCache();
    toast.success(`Payment recorded — OR ${result.transaction.receiptNumber}. Balance: ₱${result.transaction.balanceRemaining?.toFixed(2)}`);
    setAmount("");
    setReceiptNumber("");
  };

  const remove = (id: string) => {
    setState((s) => deleteCashierTransaction(s, id));
    toast.success("Transaction removed");
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader title="Cashier" description="Process payments against patient bills — revenue feeds the Dashboard in real time." />
      <div className="px-4 pt-4 shrink-0 flex flex-wrap gap-2">
        <StatChip label="Today's Collections" value={`₱${todayTotal.toLocaleString()}`} tone="success" />
        <StatChip label="Transactions" value={state.cashierTransactions.filter((t) => t.status === "Paid").length} />
      </div>
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.4fr_1fr] items-stretch min-h-0 overflow-hidden">
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-base">Payment Transactions</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>OR #</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.cashierTransactions.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No records yet</TableCell></TableRow>
                ) : txList.pageItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4 text-xs">{item.transactionDate}</TableCell>
                    <TableCell className="text-xs">{patientMap.get(item.patientId)?.lastName ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{item.receiptNumber}</TableCell>
                    <TableCell className="text-xs font-mono">{item.billId ?? "—"}</TableCell>
                    <TableCell className="text-xs">₱{item.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">₱{(item.balanceRemaining ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right pr-4">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ListPagination page={txList.page} totalPages={txList.totalPages} totalItems={txList.totalItems} onPageChange={txList.setPage} />
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-base">Process Payment</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t">
            <PatientSearchWithHistory
              patients={state.patients}
              selectedPatientId={patientId}
              onSelect={(id) => { setPatientId(id); setBillId(""); }}
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Bill / SOA</Label>
              <Select value={billId || "none"} onValueChange={(v) => setBillId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select bill" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select bill</SelectItem>
                  {openBills.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.id} — Balance ₱{computeBillBalance(b).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBill && (
              <p className="text-xs text-muted-foreground">Outstanding balance: <strong>₱{balance.toLocaleString()}</strong></p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <Input type="number" className="h-9" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={balance ? String(balance) : "0"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Payment Date</Label>
                <Input type="date" className="h-9 text-xs" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Cash", "Card", "GCash", "Insurance", "Credit"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Official Receipt Number</Label>
              <Input className="h-9 text-sm" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="Auto-generated if empty" />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => { setPatientId(""); setBillId(""); setAmount(""); }}><RotateCcw className="h-3.5 w-3.5" /> Clear</Button>
              <Button size="sm" onClick={pay}><Save className="h-3.5 w-3.5" /> Record Payment</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
