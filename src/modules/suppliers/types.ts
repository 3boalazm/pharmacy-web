import type { Money } from "@/lib/utils/money";
export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  balanceCached?: Money;
  balance?: Money; // detail endpoint renames the AP projection
  createdAt: string;
}
