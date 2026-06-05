import {
<<<<<<< HEAD
  LayoutDashboard, ShoppingCart, Pill, Users, Truck, Wallet, ReceiptText, Bell, ScrollText, Settings, PackageCheck, BarChart3, Clock,
=======
  LayoutDashboard, ShoppingCart, Pill, Users, Truck, Wallet, ReceiptText, Bell, ScrollText, Settings, PackageCheck,
>>>>>>> 6f62a637c281a0762fa880cf0a3b3c194c3e5be6
} from "lucide-react";
import type { Role } from "./auth/rbac";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** roles allowed besides OWNER (OWNER always passes) */
  roles: Role[];
}

/** Role-based navigation — single source (finance-first order per system design). */
export const NAV: NavItem[] = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["PHARMACIST"] },
  { href: "/pos", label: "نقطة البيع", icon: ShoppingCart, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { href: "/sales", label: "الفواتير", icon: ReceiptText, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { href: "/orders", label: "طلبات الستور", icon: PackageCheck, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
<<<<<<< HEAD
  { href: "/shifts", label: "الوردية", icon: Clock, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { href: "/reports", label: "التقارير", icon: BarChart3, roles: ["PHARMACIST"] },
=======
>>>>>>> 6f62a637c281a0762fa880cf0a3b3c194c3e5be6
  { href: "/finance", label: "المالية", icon: Wallet, roles: [] },
  { href: "/inventory", label: "المخزون", icon: Pill, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { href: "/customers", label: "العملاء", icon: Users, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { href: "/suppliers", label: "الموردون", icon: Truck, roles: ["PHARMACIST", "ASSISTANT"] },
  { href: "/alerts", label: "التنبيهات", icon: Bell, roles: ["PHARMACIST", "ASSISTANT"] },
  { href: "/audit", label: "سجل التدقيق", icon: ScrollText, roles: [] },
  { href: "/settings/users", label: "المستخدمون", icon: Settings, roles: [] },
];

export function navForRole(role: Role): NavItem[] {
  return NAV.filter((item) => role === "OWNER" || item.roles.includes(role));
}
