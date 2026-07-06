import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer, Save, Trash2, RotateCcw } from "lucide-react";
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
import { CashierPatientInfoSheet, CashierReceiptSheet } from "@/components/billing/CashierPrintSheets";
import { getBillingPrintCss } from "@/components/billing/billingPrintStyles";
import { OfficialSOASheet } from "@/components/billing/OfficialSOASheet";
import { SOAPrintOptionsModal } from "@/components/billing/SOAPrintOptionsModal";
import {
  DEFAULT_SOA_PRINT_OPTIONS,
  type SOAPrintOptions,
} from "@/components/billing/soaPrintOptions";
import { computeBillBalance, getPatientBills } from "@/lib/services/billingService";
import {
  deleteCashierTransaction,
  getPatientOpenBills,
  getPatientPayments,
  getRevenueForDate,
  processBillPayment,
} from "@/lib/services/cashierService";
import { syncEClaimFromBill } from "@/lib/services/eclaimService";
import { useStore, todayISO, type Bill, type CashierTransaction } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cashier")({
  head: () => ({ meta: [{ title: "Cashier — Hospital CMS" }] }),
  component: CashierPage,
});

type CashierPrintMode = "receipt" | "patient" | "soa" | null;

function CashierPage() {
  const { state, setState } = useStore();
  const [patientId, setPatientId] = useState("");
  const [billId, setBillId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "GCash" | "Insurance" | "Credit">("Cash");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayISO());
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [txFilter, setTxFilter] = useState<"all" | "patient">("all");
  const [printMode, setPrintMode] = useState<CashierPrintMode>(null);
  const [printReceiptTx, setPrintReceiptTx] = useState<CashierTransaction | null>(null);
  const [printSoaBill, setPrintSoaBill] = useState<Bill | null>(null);
  const [showSoaPrintOptions, setShowSoaPrintOptions] = useState(false);
  const [printOptions, setPrintOptions] = useState<SOAPrintOptions>(DEFAULT_SOA_PRINT_OPTIONS);

  const openBills = useMemo(() => (patientId ? getPatientOpenBills(state, patientId) : []), [state, patientId]);
  const patientBills = useMemo(() => (patientId ? getPatientBills(state, patientId) : []), [state, patientId]);
  const patientPayments = useMemo(
    () => (patientId ? getPatientPayments(state, patientId) : []),
    [state, patientId]
  );
  const selectedBill = state.bills.find((b) => b.id === billId);
  const selectedPatient = state.patients.find((p) => p.id === patientId);
  const balance = selectedBill ? computeBillBalance(selectedBill) : 0;
  const todayTotal = getRevenueForDate(state, todayISO());
  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const filteredTx = useMemo(() => {
    const list = [...state.cashierTransactions].reverse();
    if (txFilter === "patient" && patientId) {
      return list.filter((t) => t.patientId === patientId);
    }
    return list;
  }, [state.cashierTransactions, txFilter, patientId]);
  const txList = usePaginatedList(filteredTx, 50);
  const cashierName =
    state.users.find((u) => u.username === state.authedUser)?.fullName || state.authedUser || "Cashier";

  const triggerPrint = (mode: CashierPrintMode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 150);
  };

  const printReceipt = (tx: CashierTransaction) => {
    setPrintReceiptTx(tx);
    triggerPrint("receipt");
  };

  const printPatientInfo = () => {
    if (!selectedPatient) return toast.error("Select a patient first.");
    triggerPrint("patient");
  };

  const printSoa = (bill: Bill) => {
    setPrintSoaBill(bill);
    setShowSoaPrintOptions(true);
  };

  const confirmPrintSoa = () => {
    setShowSoaPrintOptions(false);
    setTimeout(() => triggerPrint("soa"), 100);
  };

  const pay = () => {
    setPaymentFeedback(null);

    if (!billId) {
      const message = "Select a bill before recording payment.";
      setPaymentFeedback({ type: "error", message });
      toast.error(message);
      return;
    }

    const payVal = parseFloat(amount) || 0;
    if (payVal <= 0) {
      const message = "Enter a payment amount greater than zero.";
      setPaymentFeedback({ type: "error", message });
      toast.error(message);
      return;
    }

    const orNumber = receiptNumber.trim() || `OR-${Date.now().toString().slice(-6)}`;
    let recorded: CashierTransaction | null = null;
    let errorMessage: string | null = null;

    setState((current) => {
      const result = processBillPayment(current, {
        billId,
        amount: payVal,
        paymentMethod,
        receiptNumber: orNumber,
        transactionDate,
        billExtras: { paymentMethod },
      });

      if ("error" in result) {
        errorMessage = result.error;
        return current;
      }

      recorded = result.transaction;
      let next = result.state;
      const updatedBill = next.bills.find((b) => b.id === billId);
      if (updatedBill?.dischargeDate) {
        next = syncEClaimFromBill(next, updatedBill);
      }
      return next;
    });

    if (errorMessage) {
      setPaymentFeedback({ type: "error", message: errorMessage });
      toast.error(errorMessage);
      return;
    }

    if (!recorded) {
      const message = "Payment could not be recorded. Please try again.";
      setPaymentFeedback({ type: "error", message });
      toast.error(message);
      return;
    }

    invalidateDashboardMetricsCache();

    const balanceRemaining = recorded.balanceRemaining ?? 0;
    const message = `Payment of ₱${payVal.toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })} recorded via ${paymentMethod}. OR #${recorded.receiptNumber}. Balance remaining: ₱${balanceRemaining.toLocaleString(
      undefined,
      { minimumFractionDigits: 2 }
    )}.`;

    setPaymentFeedback({ type: "success", message });
    toast.success(message, { duration: 6000 });
    setAmount("");
    setReceiptNumber("");
    setTxFilter("patient");
  };

  const clearForm = () => {
    setPatientId("");
    setBillId("");
    setAmount("");
    setReceiptNumber("");
    setPaymentFeedback(null);
    setTxFilter("all");
  };

  const remove = (id: string) => {
    setState((s) => deleteCashierTransaction(s, id));
    toast.success("Transaction removed");
  };

  const activePrintBill = printSoaBill ?? selectedBill;
  const activePrintReceipt = printReceiptTx;
  const activeReceiptBill = activePrintReceipt?.billId
    ? state.bills.find((b) => b.id === activePrintReceipt.billId)
    : undefined;
  const activeReceiptPatient = activePrintReceipt
    ? state.patients.find((p) => p.id === activePrintReceipt.patientId)
    : selectedPatient;

  return (
    <>
      <style>{getBillingPrintCss()}</style>

      <div className="no-print h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
        <PageHeader title="Cashier" description="Process payments, view patient payment history, and print receipts or statements." />
        <div className="px-4 pt-4 shrink-0 flex flex-wrap gap-2">
          <StatChip label="Today's Collections" value={`₱${todayTotal.toLocaleString()}`} tone="success" />
          <StatChip label="Transactions" value={state.cashierTransactions.filter((t) => t.status === "Paid").length} />
        </div>
        <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.4fr_1fr] items-stretch min-h-0 overflow-hidden">
          <Card className="flex flex-col h-full min-h-0">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Payment Transactions</CardTitle>
              <Select
                value={txFilter}
                onValueChange={(v) => setTxFilter(v as "all" | "patient")}
              >
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All patients</SelectItem>
                  <SelectItem value="patient" className="text-xs" disabled={!patientId}>
                    Selected patient only
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
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
                  {filteredTx.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        {txFilter === "patient" && patientId ? "No payments for this patient yet." : "No records yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    txList.pageItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-4 text-xs">{item.transactionDate}</TableCell>
                        <TableCell className="text-xs">{patientMap.get(item.patientId)?.lastName ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{item.receiptNumber}</TableCell>
                        <TableCell className="text-xs font-mono">{item.billId ?? "—"}</TableCell>
                        <TableCell className="text-xs">₱{item.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">₱{(item.balanceRemaining ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Print receipt"
                            onClick={() => printReceipt(item)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ListPagination
                page={txList.page}
                totalPages={txList.totalPages}
                totalItems={txList.totalItems}
                onPageChange={txList.setPage}
              />
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full min-h-0">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base">Process Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t">
              <PatientSearchWithHistory
                patients={state.patients}
                selectedPatientId={patientId}
                onSelect={(id) => {
                  setPatientId(id);
                  setBillId("");
                  setPaymentFeedback(null);
                  setTxFilter("patient");
                }}
              />

              {selectedPatient && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={printPatientInfo}>
                    <Printer className="mr-1 h-3.5 w-3.5" /> Print Patient Info
                  </Button>
                  {selectedBill && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => printSoa(selectedBill)}
                    >
                      <Printer className="mr-1 h-3.5 w-3.5" /> Print SOA
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Bill / SOA</Label>
                <Select
                  value={billId || "none"}
                  onValueChange={(v) => {
                    setBillId(v === "none" ? "" : v);
                    setPaymentFeedback(null);
                  }}
                >
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

              {patientBills.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Patient Billing History
                  </p>
                  <div className="max-h-28 space-y-1.5 overflow-y-auto">
                    {patientBills.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          className={cn(
                            "font-mono text-left hover:underline",
                            billId === b.id ? "font-semibold text-blue-600" : "text-foreground"
                          )}
                          onClick={() => setBillId(b.id)}
                        >
                          {b.id} · {b.status}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <span>₱{computeBillBalance(b).toLocaleString()}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Print SOA"
                            onClick={() => printSoa(b)}
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {patientPayments.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment History
                  </p>
                  <div className="max-h-28 space-y-1.5 overflow-y-auto">
                    {patientPayments.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                        <span>
                          {t.transactionDate} · OR {t.receiptNumber} · ₱{t.amount.toLocaleString()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          title="Print receipt"
                          onClick={() => printReceipt(t)}
                        >
                          <Printer className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBill && (
                <p className="text-xs text-muted-foreground">
                  Outstanding balance: <strong>₱{balance.toLocaleString()}</strong>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={balance ? String(balance) : "0"}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment Date</Label>
                  <Input
                    type="date"
                    className="h-9 text-xs"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Cash", "Card", "GCash", "Insurance", "Credit"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Official Receipt Number</Label>
                <Input
                  className="h-9 text-sm"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>

              {paymentFeedback ? (
                <div
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    paymentFeedback.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-900"
                  )}
                >
                  {paymentFeedback.message}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={clearForm}>
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </Button>
                <Button size="sm" onClick={pay}>
                  <Save className="h-3.5 w-3.5" /> Record Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SOAPrintOptionsModal
        open={showSoaPrintOptions}
        options={printOptions}
        onChange={setPrintOptions}
        onCancel={() => setShowSoaPrintOptions(false)}
        onConfirm={confirmPrintSoa}
        title="Print Statement of Account"
      />

      <div id="cashier-print-area" className="force-light">
        {printMode === "receipt" && activePrintReceipt && (
          <CashierReceiptSheet
            hospital={state.hospital}
            patient={activeReceiptPatient}
            transaction={activePrintReceipt}
            bill={activeReceiptBill}
            cashierName={cashierName}
          />
        )}
        {printMode === "patient" && selectedPatient && (
          <CashierPatientInfoSheet
            hospital={state.hospital}
            patient={selectedPatient}
            preparedBy={cashierName}
          />
        )}
        {printMode === "soa" && activePrintBill && (
          <OfficialSOASheet
            bill={activePrintBill}
            patient={state.patients.find((p) => p.id === activePrintBill.patientId)}
            hospital={state.hospital}
            state={state}
            billingOfficerName={cashierName}
            printOptions={printOptions}
          />
        )}
      </div>
    </>
  );
}
