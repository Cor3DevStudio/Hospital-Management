import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Save, Trash2, LogOut, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { validateAttachmentFile } from "@/lib/attachmentValidation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatChip } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import { CaseRatePicker } from "@/components/CaseRatePicker";
import { useStore, uid, todayISO, type Bill, type CaseRate } from "@/lib/store";
import { fetchCaseRateByCode } from "@/lib/services/caseRateApi";
import {
  applyCaseRateToBill,
  canCancelBillDischarge,
  computeBillBalance,
  computeBillNetTotal,
  computeBillSubtotal,
  createBill,
  deleteBill,
  normalizeBillPaymentMethod,
  resolveLineItemPrice,
  setBillDischargeDate,
  type BillLineItem,
} from "@/lib/services/billingService";
import {
  priceCategoryToChargeCategory,
  resolveChargeCategory,
} from "@/lib/services/billChargeCategories";
import { processBillPayment } from "@/lib/services/cashierService";
import { syncEClaimFromBill } from "@/lib/services/eclaimService";
import { getPriceAsOf } from "@/lib/priceService";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { invalidateDashboardMetricsCache } from "@/lib/hooks/useDashboardMetrics";
import { getBillingPrintCss } from "@/components/billing/billingPrintStyles";
import { OfficialSOASheet } from "@/components/billing/OfficialSOASheet";
import { SOAPrintOptionsModal } from "@/components/billing/SOAPrintOptionsModal";
import {
  DEFAULT_SOA_PRINT_OPTIONS,
  type SOAPrintOptions,
} from "@/components/billing/soaPrintOptions";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — Hospital CMS" }] }),
  component: BillingPage,
});

const empty = (): Bill => ({
  id: "",
  patientId: "",
  date: "",
  items: [],
  philhealthDeduction: 0,
  amountPaid: 0,
  status: "Unpaid",
  patientType: "Out-Patient",
});

function BillingPage() {
  const { state, setState, addAttachment, deleteAttachment, getAttachmentBlob } = useStore();
  const [patientId, setPatientId] = useState<string>(state.patients[0]?.id ?? "");
  const [selectedPatientId, setSelectedPatientId] = useState<string>(state.patients[0]?.id ?? "");
  // Draft Items (Charging State) — full itemized lines
  const [draftItems, setDraftItems] = useState<BillLineItem[]>([]);
  const [inputDesc, setInputDesc] = useState("");
  const [inputPrice, setInputPrice] = useState("");
  const [inputQty, setInputQty] = useState(1);
  const [selectedPriceItemId, setSelectedPriceItemId] = useState<string>("none");
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>("none");

  // Selected Bill for Payment & PhilHealth details
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [caseRateCode, setCaseRateCode] = useState<string>("none");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [dischargeDate, setDischargeDate] = useState("");

  // Preview SOA Modal State
  const [showPreview, setShowPreview] = useState(false);

  // SOA Print Options modal
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printOptions, setPrintOptions] = useState<SOAPrintOptions>(DEFAULT_SOA_PRINT_OPTIONS);

  // Computed Values
  const patient = state.patients.find((p) => p.id === selectedPatientId);
  const chargeEntryDisabledReason = selectedBill?.dischargeDate
    ? "Current bill is discharged. Charge entry is disabled."
    : "";
  const disableChargeEntry = !!chargeEntryDisabledReason;
  const cancelDischargeCheck = selectedBill ? canCancelBillDischarge(state, selectedBill) : { allowed: false };
  
  // Filter patient billing history
  const patientBills = useMemo(() => {
    return state.bills.filter((b) => b.patientId === selectedPatientId).reverse();
  }, [state.bills, selectedPatientId]);

  const patientBillList = usePaginatedList(patientBills, 30);

  const draftTotal = useMemo(() => {
    return draftItems.reduce((s, i) => s + i.amount, 0);
  }, [draftItems]);

  const todayTotal = state.bills.filter((b) => b.date === todayISO()).reduce((s, b) => s + b.amountPaid, 0);
  const unpaidCount = state.bills.filter((b) => b.status !== "Paid").length;

  // Selected Bill Stats
  const selectedBillSubtotal = selectedBill ? computeBillSubtotal(selectedBill) : 0;
  const selectedBillTotal = selectedBill ? computeBillNetTotal(selectedBill) : 0;
  const selectedBillBalance = selectedBill ? computeBillBalance(selectedBill) : 0;

  const billingAsOfDate = selectedBill?.date || todayISO();
  const [caseRateAmount, setCaseRateAmount] = useState(0);
  const [selectedCaseRate, setSelectedCaseRate] = useState<CaseRate | null>(null);

  const availablePriceItems = useMemo(() => state.prices.map((p) => ({ value: p.id, label: `${p.code} — ${p.description}` })), [state.prices]);
  const availableMedicines = useMemo(() => state.medicines.filter((m) => !m.archived).map((m) => ({ value: m.id, label: `${m.name} (${m.stock} ${m.unit || 'pcs'})` })), [state.medicines]);
  const selectedPriceItemAmount = selectedPriceItemId !== 'none' ? getPriceAsOf(state, 'priceItem', selectedPriceItemId, billingAsOfDate) : undefined;
  const selectedMedicineAmount = selectedMedicineId !== 'none' ? getPriceAsOf(state, 'medicine', selectedMedicineId, billingAsOfDate) : undefined;

  const handlePatientChange = (id: string) => {
    setPatientId(id);
    setSelectedPatientId(id);
    setDraftItems([]);
    setSelectedBill(null);
    setCaseRateCode("none");
    setCaseRateAmount(0);
    setSelectedCaseRate(null);
    setPaymentAmount("");
    setNotes("");
    setDischargeDate("");
  };

  const handleSelectBill = (bill: Bill) => {
    setSelectedBill(bill);
    setCaseRateCode(bill.caseRateCode || "none");
    setCaseRateAmount(bill.philhealthDeduction || 0);
    setPaymentAmount("");
    setNotes(bill.notes || "");
    setPaymentMethod(bill.paymentMethod || "Cash");
    setDischargeDate(bill.dischargeDate || "");
    if (bill.caseRateCode) {
      void fetchCaseRateByCode(bill.caseRateCode).then((rate) => {
        if (rate) {
          setCaseRateAmount(rate.amount);
          setSelectedCaseRate(rate);
          let updated: Bill | undefined;
          setState((s) => {
            const current = s.bills.find((b) => b.id === bill.id);
            if (!current) return s;
            const hasAutoPf = current.items.some((item) => item.source === "case-rate-pf-auto");
            const hasManualPf = current.items.some(
              (item) => item.category === "PF" && item.source !== "case-rate-pf-auto"
            );
            if (hasAutoPf || hasManualPf) return s;
            const next = applyCaseRateToBill(s, bill.id, bill.caseRateCode!, rate.amount, rate);
            updated = next.bills.find((b) => b.id === bill.id);
            return next;
          });
          if (updated) setSelectedBill(updated);
        } else {
          setSelectedCaseRate(null);
        }
      });
    } else {
      setSelectedCaseRate(null);
    }
  };

  // Charge Actions
  const addConsultation = () => {
    if (disableChargeEntry) return toast.error(chargeEntryDisabledReason);
    setDraftItems([
      ...draftItems,
      {
        description: "Consultation Fee",
        category: "PF",
        unitPrice: 500,
        qty: 1,
        amount: 500,
        effectiveDate: billingAsOfDate,
      },
    ]);
    toast.success("Consultation Fee added to draft");
  };

  const handleAddItem = () => {
    if (disableChargeEntry) return toast.error(chargeEntryDisabledReason);
    const priceItemId = selectedPriceItemId !== "none" ? selectedPriceItemId : undefined;
    const medicineId = selectedMedicineId !== "none" ? selectedMedicineId : undefined;
    const priceItem = priceItemId ? state.prices.find((p) => p.id === priceItemId) : undefined;
    const medicine = medicineId ? state.medicines.find((m) => m.id === medicineId) : undefined;
    const resolvedPrice = resolveLineItemPrice(state, {
      priceItemId,
      medicineId,
      manualPrice: parseFloat(inputPrice) || 0,
      asOfDate: billingAsOfDate,
    });
    if (!inputDesc && !priceItemId && !medicineId) return toast.error("Item Description is required");
    if (!resolvedPrice || resolvedPrice <= 0) return toast.error("Unit Price must be greater than 0");
    if (medicine && medicine.stock < inputQty) {
      return toast.error(`Insufficient stock for ${medicine.name} (have ${medicine.stock})`);
    }
    const description =
      inputDesc || priceItem?.description || medicine?.name || "";
    const category = medicineId
      ? "Medicine"
      : priceItem
        ? priceCategoryToChargeCategory(priceItem.category)
        : resolveChargeCategory(state, { description });

    setDraftItems([
      ...draftItems,
      {
        description,
        category,
        unitPrice: resolvedPrice,
        qty: inputQty,
        amount: resolvedPrice * inputQty,
        priceItemId,
        medicineId,
        effectiveDate: billingAsOfDate,
      },
    ]);
    setInputDesc("");
    setInputPrice("");
    setInputQty(1);
    setSelectedPriceItemId("none");
    setSelectedMedicineId("none");
    toast.success("Itemized charge added to draft");
  };

  const handleCreateBill = () => {
    if (disableChargeEntry) return toast.error(chargeEntryDisabledReason);
    if (!patientId) return toast.error("Please select a patient first");
    if (draftItems.length === 0) return toast.error("No charges in draft to bill");

    let createdBill: Bill | null = null;
    setState((s) => {
      const result = createBill(s, {
        patientId,
        items: draftItems,
        date: todayISO(),
      });
      if ("error" in result) {
        toast.error(result.error);
        return s;
      }
      createdBill = result.bill;
      return syncEClaimFromBill(result.state, result.bill);
    });
    if (!createdBill) return;
    setDraftItems([]);
    setSelectedBill(createdBill);
    toast.success("Billing statement created successfully!");
  };

  // Payment Actions
  const handleCaseRateChange = (val: string, amount = 0, rate?: CaseRate) => {
    setCaseRateCode(val);
    setCaseRateAmount(amount);
    setSelectedCaseRate(rate ?? null);
    if (!selectedBill) return;
    let updated: Bill | undefined;
    setState((s) => {
      let next = applyCaseRateToBill(s, selectedBill.id, val, amount, rate);
      updated = next.bills.find((b) => b.id === selectedBill.id);
      if (updated) next = syncEClaimFromBill(next, updated);
      return next;
    });
    if (updated) setSelectedBill(updated);
    toast.info("PhilHealth case rate updated");
  };

  const handleDischargeDateChange = (val: string) => {
    setDischargeDate(val);
    if (!selectedBill) return;
    let updated: Bill | undefined;
    let failed = false;
    setState((s) => {
      const result = setBillDischargeDate(s, selectedBill.id, val || undefined);
      if (result.error) {
        toast.error(result.error);
        failed = true;
        return s;
      }
      updated = result.state.bills.find((b) => b.id === selectedBill.id);
      return result.state;
    });
    if (failed) return;
    if (updated) setSelectedBill(updated);
    toast.success(
      val
        ? `Discharge set to ${val}. Room & Board auto-computed from admission stay.`
        : "Discharge date cleared"
    );
  };

  const handleCancelDischarge = () => {
    if (!selectedBill) return;
    const check = canCancelBillDischarge(state, selectedBill);
    if (!check.allowed) return toast.error(check.reason || "Cannot cancel discharge");
    setDischargeDate("");
    let updated: Bill | undefined;
    setState((s) => {
      const result = setBillDischargeDate(s, selectedBill.id, undefined);
      if (result.error) return s;
      updated = result.state.bills.find((b) => b.id === selectedBill.id);
      return result.state;
    });
    if (updated) setSelectedBill(updated);
    toast.success("Discharge cancelled");
  };

  const handleApplyPhilHealthPay = () => {
    if (!selectedBill) return;
    const payVal = parseFloat(paymentAmount) || 0;
    const normalizedMethod = normalizeBillPaymentMethod(paymentMethod);
    let updated: Bill | undefined;
    let failed = false;
    setState((s) => {
      let next = applyCaseRateToBill(s, selectedBill.id, caseRateCode, caseRateAmount, selectedCaseRate);
      if (payVal > 0) {
        const result = processBillPayment(next, {
          billId: selectedBill.id,
          amount: payVal,
          paymentMethod: normalizedMethod,
          billExtras: { paymentMethod, notes, dischargeDate: dischargeDate || undefined },
        });
        if ("error" in result) {
          toast.error(result.error);
          failed = true;
          return s;
        }
        next = result.state;
      } else if (notes || dischargeDate) {
        next = {
          ...next,
          bills: next.bills.map((b) =>
            b.id === selectedBill.id
              ? { ...b, notes: notes || b.notes, dischargeDate: dischargeDate || b.dischargeDate, paymentMethod: paymentMethod || b.paymentMethod }
              : b
          ),
        };
      }
      updated = next.bills.find((b) => b.id === selectedBill.id);
      if (updated && dischargeDate) next = syncEClaimFromBill(next, updated);
      return next;
    });
    if (failed) return;
    invalidateDashboardMetricsCache();
    if (updated) setSelectedBill(updated);
    setPaymentAmount("");
    toast.success("PhilHealth case rate applied and payment recorded!");
  };

  const handleRecordPayment = () => {
    if (!selectedBill) return;
    const payVal = parseFloat(paymentAmount) || 0;
    if (payVal <= 0) return toast.error("Enter payment amount");
    const normalizedMethod = normalizeBillPaymentMethod(paymentMethod);
    let updated: Bill | undefined;
    let failed = false;
    setState((s) => {
      const result = processBillPayment(s, {
        billId: selectedBill.id,
        amount: payVal,
        paymentMethod: normalizedMethod,
        billExtras: { paymentMethod, notes, dischargeDate: dischargeDate || undefined },
      });
      if ("error" in result) {
        toast.error(result.error);
        failed = true;
        return s;
      }
      let next = result.state;
      updated = next.bills.find((b) => b.id === selectedBill.id);
      if (updated && dischargeDate) next = syncEClaimFromBill(next, updated);
      return next;
    });
    if (failed) return;
    invalidateDashboardMetricsCache();
    if (updated) setSelectedBill(updated);
    setPaymentAmount("");
    toast.success("Payment recorded successfully!");
  };

  const handleDeleteBill = (billId: string) => {
    setState((s) => deleteBill(s, billId));
    if (selectedBill?.id === billId) setSelectedBill(null);
    toast.success("Bill deleted and inventory restored");
  };

  const openPreviewSoa = () => {
    if (!selectedBill) return toast.error("Select a bill first");
    setShowPreview(true);
  };

  const openPrintOptions = (mode: "print" | "preview") => {
    if (!selectedBill) return toast.error("Select a bill first");
    if (mode === "preview") {
      openPreviewSoa();
      return;
    }
    setShowPrintOptions(true);
  };

  const handlePrintOptionsConfirm = () => {
    setShowPrintOptions(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const activePrintBill = selectedBill || empty();
  const activePrintPatient = state.patients.find((p) => p.id === activePrintBill.patientId);
  const billingOfficerName = state.users.find((u) => u.username === state.authedUser)?.fullName || "System Administrator";

  return (
    <>
      <style>{getBillingPrintCss()}</style>

      {/* Main Billing UI Dashboard */}
      <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background no-print">
        <PageHeader title="Billing" description="Create bills, apply PhilHealth benefits, collect payments, and discharge patients." />
        
        <div className="px-4 pt-4 shrink-0 flex flex-wrap gap-2">
          <StatChip label="Today Collected" value={`₱${todayTotal.toLocaleString()}`} tone="success" />
          <StatChip label="Unpaid Bills" value={unpaidCount} tone="warning" />
          <StatChip label="Total Bills" value={state.bills.length} />
        </div>

        {/* 3-Column layout: Left (Patient & History), Middle (Charging & Draft), Right (Payment Form) */}
        <div className="flex-1 grid gap-4 p-4 md:grid-cols-[280px_minmax(0,1fr)_minmax(0,1.1fr)] lg:grid-cols-[320px_minmax(0,1fr)_minmax(0,1.1fr)] items-stretch min-h-0 overflow-hidden">
          
          {/* Column 1: Patient Select & Billing History */}
          <Card className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 space-y-2 shrink-0">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Patient Billing Directory</CardTitle>
              <PatientSearchWithHistory
                patients={state.patients}
                selectedPatientId={selectedPatientId}
                onSelect={handlePatientChange}
                showAdmissionHistory={false}
                buttonSize="sm"
                buttonClassName="h-8 text-xs"
              />
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-4 pt-0 border-t flex flex-col min-h-0">
              <div className="mt-3 min-h-0 flex-1 flex flex-col">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Billing History</p>
                <div className="space-y-2 overflow-y-auto flex-1 pr-1 min-h-0">
                  {patientBillList.pageItems.map((b) => (
                    <button 
                      key={b.id} 
                      onClick={() => handleSelectBill(b)} 
                      className={`w-full rounded-md border p-3 text-left hover:bg-muted transition-colors flex flex-col gap-1.5 ${selectedBill?.id === b.id ? "bg-muted border-blue-500 shadow-sm" : ""}`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-semibold text-blue-600 font-mono text-xs">{b.id}</span>
                        <Badge className={`text-[9px] font-bold px-1.5 py-0 ${b.status === "Paid" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : b.status === "Partial" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-red-100 text-red-800 border-red-300"}`} variant="outline">
                          {b.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Total: ₱{(b.items.reduce((s, i) => s + (i.amount || 0), 0) - b.philhealthDeduction).toLocaleString()} · Paid: ₱{b.amountPaid.toLocaleString()}
                      </p>
                    </button>
                  ))}
                  {patientBills.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No billing history for this patient.</p>}
                </div>
                <ListPagination
                  page={patientBillList.page}
                  totalPages={patientBillList.totalPages}
                  totalItems={patientBillList.totalItems}
                  onPageChange={patientBillList.setPage}
                  className="mt-2 flex items-center justify-between px-0 py-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Column 2: Add Charges & Line Items (Charging Process) */}
          <div className="flex flex-col gap-4 min-h-0 min-w-0 overflow-hidden">
            {/* Add Charges */}
            <Card className="flex-none">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm font-bold">Add Charges</CardTitle>
                <CardDescription className="text-[11px]">Line items for the current bill draft</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Item Description</Label>
                  <Input value={inputDesc} onChange={(e) => setInputDesc(e.target.value)} placeholder="e.g. Laboratory Panel, Pharmacy stock..." className="h-9" />
                </div>
                <div className="grid gap-2 md:grid-cols-[1.5fr_1fr]">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Price Item</Label>
                    <Select value={selectedPriceItemId} onValueChange={(val) => { setSelectedPriceItemId(val); if (val !== 'none') setSelectedMedicineId('none'); }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select a price item" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {availablePriceItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Medicine</Label>
                    <Select value={selectedMedicineId} onValueChange={(val) => { setSelectedMedicineId(val); if (val !== 'none') setSelectedPriceItemId('none'); }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select a medicine" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {availableMedicines.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(selectedPriceItemAmount !== undefined || selectedMedicineAmount !== undefined) && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-semibold">Resolved Unit Price</p>
                    <p>{selectedPriceItemAmount !== undefined ? `Price item unit rate: ₱${selectedPriceItemAmount.toFixed(2)} as of ${billingAsOfDate}` : selectedMedicineAmount !== undefined ? `Medicine unit price: ₱${selectedMedicineAmount.toFixed(2)} as of ${billingAsOfDate}` : ""}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit Price</Label>
                    <Input type="number" value={inputPrice} onChange={(e) => setInputPrice(e.target.value)} placeholder="0.00" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <Input type="number" value={inputQty} onChange={(e) => setInputQty(Math.max(1, +e.target.value))} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5">
                  <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={addConsultation}>Add Consultation Fee</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleAddItem}>Add Item</Button>
                </div>
              </CardContent>
            </Card>

            {/* Line Items List */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm font-bold">Line Items</CardTitle>
                <CardDescription className="text-[11px]">Draft charges before billing is created</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-3 pt-1 border-t flex flex-col justify-between min-h-0">
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {draftItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center rounded-md border p-2.5 bg-muted/20 text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.category || "Other"} · {item.effectiveDate || billingAsOfDate} · Qty {item.qty} × ₱{item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-blue-600">₱{item.amount.toFixed(2)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {draftItems.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No draft charges. Add items above.</p>}
                </div>

                <div className="flex justify-between items-center border-t pt-2.5 mt-2.5 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => setDraftItems([])} disabled={disableChargeEntry}>Clear Items</Button>
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreateBill} disabled={disableChargeEntry}>Create Bill</Button>
                </div>
                {disableChargeEntry && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
                    {chargeEntryDisabledReason}
                  </p>
                )}
                <div className="flex justify-end pt-1.5 shrink-0">
                  <p className="text-sm font-bold text-blue-600">Draft Total: ₱{draftTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Payment & PhilHealth */}
          <Card className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-bold">Payment & PhilHealth</CardTitle>
              <CardDescription className="text-[11px]">Apply benefits, record payment, and print documents</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t flex flex-col justify-between min-h-0">
              {selectedBill ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="rounded border p-2.5 text-xs bg-blue-50/50 space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Active Statement:</span><span className="font-mono font-semibold">{selectedBill.id}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Statement Date:</span><span>{selectedBill.date}</span></div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">PhilHealth Case Rate (optional)</Label>
                      <CaseRatePicker
                        value={caseRateCode}
                        amount={caseRateAmount}
                        onSelect={handleCaseRateChange}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Payment Amount</Label>
                        <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Cash", "GCash", "PayMaya", "Credit Card", "Bank Transfer"].map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter details..." className="h-9" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
                        <span>Date Discharged</span>
                        {dischargeDate && (
                          <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-300">
                            Discharged
                          </Badge>
                        )}
                      </Label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Input 
                          type="date" 
                          value={dischargeDate} 
                          onChange={(e) => handleDischargeDateChange(e.target.value)} 
                          className="h-9 flex-1" 
                        />
                        {selectedBill?.dischargeDate && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 px-3 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => handleCancelDischarge()}
                            disabled={!cancelDischargeCheck.allowed}
                            title={cancelDischargeCheck.reason}
                          >
                            Cancel Discharge
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-1">
                      <div className="flex justify-between"><span>Gross Subtotal</span><span>₱{selectedBillSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>PhilHealth Deduction</span><span>− ₱{selectedBill.philhealthDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between font-semibold"><span>Total Net Due</span><span>₱{selectedBillTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Amount Paid</span><span>₱{selectedBill.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between text-xs font-bold border-t pt-1 mt-1"><span>Outstanding Balance</span><span className={selectedBillBalance > 0 ? "text-red-600" : "text-black"}>₱{selectedBillBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</p>
                      <div className="mt-2 space-y-2">
<Input type="file" accept="application/pdf,application/xml,text/xml" onChange={async (e) => {
                            const f = (e.target as HTMLInputElement).files?.[0];
                            if (!f) return;
                            const validation = validateAttachmentFile(f);
                            if (!validation.valid) {
                              return toast.error(validation.message);
                            }
                            if (!selectedBill) return toast.error("No bill selected");
                            try {
                              await addAttachment("bill", selectedBill.id, f);
                              toast.success("Attachment uploaded");
                            } catch (err) {
                              console.error(err);
                              toast.error(err instanceof Error ? err.message : "Failed to upload attachment");
                          }
                          (e.target as HTMLInputElement).value = "";
                        }} />

                        <div className="space-y-2">
                          {((state.attachments || []) as any).filter((a: any) => a.refType === "bill" && a.refId === selectedBill.id).length === 0 && (
                            <p className="text-sm text-muted-foreground">No documents attached to this bill.</p>
                          )}
                          {((state.attachments || []) as any).filter((a: any) => a.refType === "bill" && a.refId === selectedBill.id).map((a: any) => (
                            <div key={a.id} className="flex items-center justify-between rounded border p-2">
                              <div>
                                <div className="font-medium text-sm">{a.filename}</div>
                                <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()} · {(a.size/1024).toFixed(1)} KB</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={async () => {
                                  const blob = await getAttachmentBlob(a.key);
                                  if (!blob) return toast.error("File not found");
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, "_blank");
                                  setTimeout(() => URL.revokeObjectURL(url), 30_000);
                                }}>Open</Button>
                                <Button size="sm" variant="outline" onClick={async () => {
                                  const blob = await getAttachmentBlob(a.key);
                                  if (!blob) return toast.error("File not found");
                                  const url = URL.createObjectURL(blob);
                                  const el = document.createElement("a");
                                  el.href = url;
                                  el.download = a.filename || "document.pdf";
                                  document.body.appendChild(el);
                                  el.click();
                                  el.remove();
                                  URL.revokeObjectURL(url);
                                }}><Download className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  if (!confirm("Delete this attachment?")) return;
                                  await deleteAttachment(a.id);
                                  toast.success("Attachment removed");
                                }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-3 mt-4 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" className="h-8.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApplyPhilHealthPay}>Apply PhilHealth & Pay</Button>
                      <Button size="sm" className="h-8.5 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRecordPayment}>Record Payment</Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => handleDeleteBill(selectedBill.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Bill
                    </Button>
                    <div className="grid grid-cols-2 gap-1">
                      <Button size="sm" variant="outline" className="h-8.5 text-[11px]" onClick={openPreviewSoa}>Preview SOA</Button>
                      <Button size="sm" variant="outline" className="h-8.5 text-[11px]" onClick={() => openPrintOptions("print")}>Print SOA</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-xs text-muted-foreground">
                  <p>Select a bill from the patient's Billing History on the left to process payments, apply case rates, and print statements.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SOAPrintOptionsModal
        open={showPrintOptions}
        options={printOptions}
        onChange={setPrintOptions}
        onCancel={() => setShowPrintOptions(false)}
        onConfirm={handlePrintOptionsConfirm}
        title="Print SOA"
        confirmLabel="Print"
      />

      {/* Statement of Account Preview Dialog Overlay */}
      {showPreview && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
          <div className="bg-card text-card-foreground rounded-lg shadow-2xl max-w-[900px] w-full max-h-[90vh] flex flex-col border border-border">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Statement of Account Preview</h3>
                <p className="text-[11px] text-muted-foreground">
                  Official SOA format · {printOptions.status}
                  {printOptions.forPhilHealth ? " · PhilHealth" : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowPreview(false)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-muted/40">
              <div className="force-light mx-auto">
                <OfficialSOASheet
                  bill={selectedBill}
                  patient={patient}
                  hospital={state.hospital}
                  state={state}
                  billingOfficerName={billingOfficerName}
                  printOptions={printOptions}
                  caseRate={selectedCaseRate}
                  caseRateDescription={selectedCaseRate?.description}
                />
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/40">
              <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>Close</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPreview(false);
                  openPrintOptions("print");
                }}
              >
                Print Options…
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowPreview(false);
                  setTimeout(() => window.print(), 150);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white flex gap-1"
              >
                <Printer className="h-4 w-4" /> Print SOA
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Official SOA.html layout — print only; geometry must not change */}
      <div id="print-area" className="force-light">
        <OfficialSOASheet
          bill={activePrintBill}
          patient={activePrintPatient}
          hospital={state.hospital}
          state={state}
          billingOfficerName={billingOfficerName}
          printOptions={printOptions}
          caseRate={selectedCaseRate}
          caseRateDescription={selectedCaseRate?.description}
        />
      </div>
    </>
  );
}
