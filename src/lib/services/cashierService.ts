import {
  computeBillBalance,
  getPatientBills,
  recordPayment,
} from "@/lib/services/billingService";
import { uid, todayISO, type AppState, type Bill, type CashierTransaction } from "@/lib/store";

export function getPatientOpenBills(state: AppState, patientId: string): Bill[] {
  return getPatientBills(state, patientId).filter((b) => computeBillBalance(b) > 0);
}

export function getRevenueForDate(state: AppState, date: string): number {
  return state.cashierTransactions
    .filter((t) => t.status === "Paid" && t.transactionDate === date)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getRevenueForMonth(state: AppState, monthPrefix: string): number {
  return state.cashierTransactions
    .filter((t) => t.status === "Paid" && t.transactionDate.startsWith(monthPrefix))
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getRevenueChartData(state: AppState, days = 7): { day: string; revenue: number }[] {
  const revenueByDate = new Map<string, number>();
  for (const t of state.cashierTransactions) {
    if (t.status !== "Paid") continue;
    revenueByDate.set(t.transactionDate, (revenueByDate.get(t.transactionDate) ?? 0) + t.amount);
  }
  return Array.from({ length: days }).map((_, i) => {
    const d = todayISO(-(days - 1 - i));
    return { day: d.slice(5), revenue: revenueByDate.get(d) ?? 0 };
  });
}

export function processBillPayment(
  state: AppState,
  input: {
    billId: string;
    amount: number;
    paymentMethod: CashierTransaction["paymentMethod"];
    receiptNumber?: string;
    transactionDate?: string;
    description?: string;
    billExtras?: Parameters<typeof recordPayment>[3];
  }
): { state: AppState; transaction: CashierTransaction } | { error: string } {
  const bill = state.bills.find((b) => b.id === input.billId);
  if (!bill) return { error: "Bill not found" };
  if (input.amount <= 0) return { error: "Payment amount must be greater than zero" };

  const balanceBefore = computeBillBalance(bill);
  if (input.amount > balanceBefore + 0.01) {
    return { error: `Payment exceeds balance (₱${balanceBefore.toFixed(2)})` };
  }

  let next = recordPayment(state, input.billId, input.amount, input.billExtras);
  const updatedBill = next.bills.find((b) => b.id === input.billId)!;
  const balanceRemaining = computeBillBalance(updatedBill);

  const transaction: CashierTransaction = {
    id: `CSH-${uid().toUpperCase()}`,
    patientId: bill.patientId,
    billId: bill.id,
    transactionDate: input.transactionDate ?? todayISO(),
    amount: input.amount,
    balanceRemaining,
    paymentMethod: input.paymentMethod,
    status: "Paid",
    receiptNumber: input.receiptNumber,
    description: input.description ?? `Payment for ${bill.id}`,
  };

  next = {
    ...next,
    cashierTransactions: [...(next.cashierTransactions ?? []), transaction],
  };

  return { state: next, transaction };
}

export function createCashierTransaction(
  state: AppState,
  form: Omit<CashierTransaction, "id">
): AppState {
  return {
    ...state,
    cashierTransactions: [...state.cashierTransactions, { ...form, id: `CSH-${uid().toUpperCase()}` }],
  };
}

export function updateCashierTransaction(state: AppState, form: CashierTransaction): AppState {
  return {
    ...state,
    cashierTransactions: state.cashierTransactions.map((t) => (t.id === form.id ? form : t)),
  };
}

export function deleteCashierTransaction(state: AppState, transactionId: string): AppState {
  return {
    ...state,
    cashierTransactions: state.cashierTransactions.filter((t) => t.id !== transactionId),
  };
}
