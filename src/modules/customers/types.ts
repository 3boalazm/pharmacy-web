import type { Money } from "@/lib/utils/money";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  creditLimit: Money;
  /** Projection from the AR subledger — read-only by design (Contract §7). */
  balance: Money;
  totalPurchases: Money;
  totalPaid: Money;
  loyaltyPoints: number;
  lastVisit: string | null;
  allergies: string[];
  portalStatus?: "ACTIVE" | "PENDING" | null;
}
export interface StatementRow {
  date: string;
  description: string;
  debit: Money | null;   // مشتريات
  credit: Money | null;  // سداد
  runningBalance: Money;
  journalEntryId: string;
}
export interface Statement {
  openingBalance: Money;
  closingBalance: Money;
  rows: StatementRow[];
}
