import {
  LayoutDashboard, ShoppingCart, Pill, Users, Truck, Wallet, ReceiptText, Bell, ScrollText, Settings, PackageCheck, BarChart3, Clock, FileText, TrendingUp,
} from "lucide-react";
import type { Role } from "./auth/rbac";

export interface NavItem {
  section?: string;
  href: string;
  label: string;
  icon: React.ElementType;
  /** roles allowed besides OWNER (OWNER always passes) */
  roles: Role[];
}

/** Role-based navigation — single source (finance-first order per system design). */
export const NAV: NavItem[] = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["PHARMACIST"] },
  { section: "المبيعات", href: "/pos", label: "نقطة البيع", icon: ShoppingCart, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { section: "المبيعات", href: "/sales", label: "الفواتير", icon: ReceiptText, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { section: "المبيعات", href: "/orders", label: "طلبات الستور", icon: PackageCheck, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { section: "المبيعات", href: "/prescriptions", label: "الروشتات", icon: FileText, roles: ["PHARMACIST", "ASSISTANT"] },
  { section: "المبيعات", href: "/shifts", label: "الوردية", icon: Clock, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { section: "المالية والتقارير", href: "/insights", label: "الرؤى التحليلية", icon: TrendingUp, roles: ["PHARMACIST"] },
  { section: "المالية والتقارير", href: "/reports", label: "التقارير", icon: BarChart3, roles: ["PHARMACIST"] },
  { section: "المالية والتقارير", href: "/finance", label: "المالية", icon: Wallet, roles: [] },
  { section: "المخزون والمشتريات", href: "/inventory", label: "المخزون", icon: Pill, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { section: "المخزون والمشتريات", href: "/suppliers", label: "الموردون", icon: Truck, roles: ["PHARMACIST", "ASSISTANT"] },
  { section: "العملاء", href: "/customers", label: "العملاء", icon: Users, roles: ["PHARMACIST", "ASSISTANT", "CASHIER"] },
  { section: "النظام", href: "/alerts", label: "التنبيهات", icon: Bell, roles: ["PHARMACIST", "ASSISTANT"] },
  { section: "النظام", href: "/audit", label: "سجل التدقيق", icon: ScrollText, roles: [] },
  { section: "النظام", href: "/settings/users", label: "المستخدمون", icon: Settings, roles: [] },
];

export function navForRole(role: Role): NavItem[] {
  return NAV.filter((item) => role === "OWNER" || item.roles.includes(role));
}

/**
 * صلاحيات المسارات الفرعية التي لا تظهر كعناصر قائمة مستقلة.
 * الحماية الفعلية تبقى على الخادم؛ هذا الحارس يمنع فتح شاشة بالرابط المباشر
 * ويعطي رسالة مفهومة بدل شاشة فارغة أو أخطاء 403 متتالية.
 */
const EXTRA_PATH_ROLES: { pattern: RegExp; roles: Role[] }[] = [
  // استلام شحنة وتسوية مخزون: ليست عمل الكاشير
  { pattern: /^\/inventory\/(grn|adjustments)(\/|$)/, roles: ["PHARMACIST", "ASSISTANT"] },
];

/** هل يستطيع الدور فتح هذا المسار؟ (المالك يمر دائمًا) */
export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === "OWNER") return true;
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  const extra = EXTRA_PATH_ROLES.find((r) => r.pattern.test(clean));
  if (extra) return extra.roles.includes(role);

  if (clean === "/") return NAV[0].roles.includes(role);

  const matches = NAV
    .filter((item) => item.href !== "/")
    .filter((item) => clean === item.href || clean.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length);

  if (matches.length > 0) return matches[0].roles.includes(role);
  return true; // مسار غير معروف (404) — نتركه لصفحة not-found
}

/** أول مسار مسموح للدور — وجهة التحويل عند محاولة فتح شاشة محجوبة. */
export function firstAllowedPath(role: Role): string {
  return navForRole(role)[0]?.href ?? "/pos";
}

/** عناصر القائمة مجمعة بأقسام (لوحة التحكم تظل أعلى بدون قسم). */
export function navGroupsForRole(role: Role): { section: string | null; items: NavItem[] }[] {
  const items = navForRole(role);
  const groups: { section: string | null; items: NavItem[] }[] = [];
  for (const item of items) {
    const sec = item.section ?? null;
    const last = groups[groups.length - 1];
    if (last && last.section === sec) last.items.push(item);
    else groups.push({ section: sec, items: [item] });
  }
  return groups;
}
