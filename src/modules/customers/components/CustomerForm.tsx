"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createCustomer, updateCustomer } from "../api";
import { zCustomerForm, type CustomerFormValues } from "../schemas";
import type { Customer } from "../types";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Customer CRUD form (create + edit) — RHF + Zod. Balance is intentionally absent: it is a ledger projection. */
export function CustomerForm({ open, onOpenChange, onSaved, customer }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  customer?: Customer | null; // present = edit mode
}) {
  const toast = useToast();
  const editing = !!customer;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(zCustomerForm),
    defaultValues: { name: "", phone: "", creditLimit: "500.0000", allergies: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        customer
          ? { name: customer.name, phone: customer.phone, creditLimit: customer.creditLimit, allergies: customer.allergies.join("، ") }
          : { name: "", phone: "", creditLimit: "500.0000", allergies: "" },
      );
    }
  }, [open, customer, form]);

  const save = useMutation({
    mutationFn: (v: CustomerFormValues) => {
      const allergies = (v.allergies ?? "").split(/[,،]/).map((a) => a.trim()).filter(Boolean);
      const payload = { name: v.name, phone: v.phone, creditLimit: v.creditLimit, allergies };
      return editing ? updateCustomer(customer!.id, payload) : createCustomer(payload);
    },
    onSuccess: () => { toast("success", editing ? "تم تحديث بيانات العميل" : "تمت إضافة العميل"); onSaved(); },
    onError: (e: Error) => toast("error", e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? `تعديل — ${customer!.name}` : "عميل جديد"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <DialogBody className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم</FormLabel>
                  <FormControl><Input autoFocus {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl><Input inputMode="tel" dir="ltr" className="text-end" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="creditLimit" render={({ field }) => (
                <FormItem>
                  <FormLabel>حد الائتمان (ج.م)</FormLabel>
                  <FormControl><Input inputMode="decimal" dir="ltr" className="num text-end" {...field} /></FormControl>
                  <p className="text-xs text-ink-faint">أقصى مديونية قبل طلب موافقة صيدلي/مالك</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="allergies" render={({ field }) => (
                <FormItem>
                  <FormLabel>الحساسية الدوائية</FormLabel>
                  <FormControl><Input placeholder="penicillin، aspirin" {...field} value={field.value ?? ""} /></FormControl>
                  <p className="text-xs text-ink-faint">تُستخدم في فحص DUR عند البيع — افصل بفاصلة</p>
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button type="submit" loading={save.isPending}>{editing ? "حفظ التعديلات" : "حفظ"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
