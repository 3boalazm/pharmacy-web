"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchCustomers } from "@/modules/customers";
import { usePosStore } from "../store";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";
import { ChevronDown, UserRound, X } from "lucide-react";

/** Customer Selection — cmdk-in-popover over GET /customers (Customers facade only). */
export function CustomerSelect() {
  const { customer, setCustomer } = usePosStore();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["customers.search", term],
    queryFn: ({ signal }) => searchCustomers({ search: term }, signal),
    enabled: open && term.trim().length >= 2,
    select: (r) => r.data,
  });

  if (customer) {
    const nearLimit = Number(customer.balance) >= Number(customer.creditLimit) * 0.8;
    return (
      <div className="flex items-center justify-between rounded-el bg-primary-soft px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-primary-ink">
          <UserRound className="size-4 shrink-0" />
          <span className="truncate">{customer.name}</span>
          {nearLimit && <Badge tone="amber">قارب الحد</Badge>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="num text-xs text-primary-ink/80">مديونية {formatMoney(customer.balance)}</span>
          <span className="num text-xs text-primary-ink/80">· نقاط {customer.loyaltyPoints}</span>
          <button onClick={() => setCustomer(null)} aria-label="إزالة العميل" className="rounded p-1 text-primary-ink hover:bg-card">
            <X className="size-4" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-10 w-full items-center justify-between rounded-el border border-line bg-card px-3 text-sm text-ink-faint transition-colors hover:border-primary">
        عميل (اختياري — مطلوب للبيع الآجل)
        <ChevronDown className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput autoFocus value={term} onValueChange={setTerm} placeholder="ابحث بالاسم أو الهاتف…" />
          <CommandList className="max-h-56">
            {term.trim().length < 2 ? (
              <p className="py-6 text-center text-xs text-ink-faint">اكتب حرفين على الأقل</p>
            ) : (
              <>
                {!isFetching && <CommandEmpty className="py-6 text-center text-xs text-ink-faint">لا يوجد عميل مطابق</CommandEmpty>}
                {(data ?? []).slice(0, 8).map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      setCustomer({ id: c.id, name: c.name, balance: c.balance, creditLimit: c.creditLimit, loyaltyPoints: c.loyaltyPoints ?? 0 });
                      setOpen(false);
                      setTerm("");
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.allergies.length > 0 && <Badge tone="red">حساسية</Badge>}
                    </span>
                    <span className="num text-xs text-ink-faint">{formatMoney(c.balance)}</span>
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
