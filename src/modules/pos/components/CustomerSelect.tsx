"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchCustomers, createCustomer } from "@/modules/customers";
import { usePosStore } from "../store";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";
import { ChevronDown, UserPlus, UserRound, X } from "lucide-react";

/** Customer Selection — cmdk-in-popover over GET /customers (Customers facade only). */
export function CustomerSelect() {
  const { customer, setCustomer } = usePosStore();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const toast = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const create = useMutation({
    mutationFn: () => createCustomer({ name: newName.trim(), phone: newPhone.trim(), creditLimit: "0", allergies: [] }),
    onSuccess: ({ data }) => {
      toast("success", `أُضيف العميل ${data.name}`);
      setCustomer({ id: data.id, name: data.name, balance: data.balance ?? "0", creditLimit: data.creditLimit ?? "0", loyaltyPoints: 0 });
      qc.invalidateQueries({ queryKey: ["customers.search"] });
      setCreateOpen(false); setOpen(false); setNewName(""); setNewPhone(""); setTerm("");
    },
    onError: (e: Error) => toast("error", e.message),
  });
  const openCreate = () => { setNewName(term); setNewPhone(""); setCreateOpen(true); };

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
                <button onClick={openCreate}
                  className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-start text-sm font-bold text-primary-ink hover:bg-primary-soft">
                  <UserPlus className="size-4" /> إضافة عميل جديد{term.trim() ? ` «${term.trim()}»` : ""}
                </button>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>

      {/* تسجيل عميل سريع — بلا مغادرة شاشة البيع */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>عميل جديد</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <Input label="الاسم" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            <Input label="رقم الهاتف" inputMode="tel" dir="ltr" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <p className="rounded-el bg-paper px-3 py-2 text-[11px] text-ink-faint">حد الائتمان صفر مبدئيًا — يُعدّل لاحقًا من صفحة العميل عند الحاجة للبيع الآجل.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button loading={create.isPending} disabled={newName.trim().length < 2 || newPhone.trim().length < 6} onClick={() => create.mutate()}>حفظ واختيار</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
