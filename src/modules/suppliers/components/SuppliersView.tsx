"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listSuppliers, createSupplier } from "../api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { Truck } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "أدخل اسم المورد"),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/** Suppliers registry — feeds GRN; balance column is the AP subledger projection. */
export function SuppliersView() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: ({ signal }) => listSuppliers(search || undefined, signal),
    select: (r) => r.data,
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "" } });
  const create = useMutation({
    mutationFn: (v: FormValues) => createSupplier({ name: v.name, phone: v.phone || undefined }),
    onSuccess: () => { toast("success", "تمت إضافة المورد"); form.reset(); setOpen(false); refetch(); },
    onError: (e: Error) => toast("error", e.message),
  });

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في الموردين…" className="h-9 w-64" />
        <Button size="sm" className="ms-auto" onClick={() => setOpen(true)}>
          <Truck className="size-4" /> مورد جديد
        </Button>
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : !data?.length ? (
        <EmptyState title="لا يوجد موردون" hint="أضف الموردين لتفعيل استلام الشحنات" />
      ) : (
        <Table>
          <THead><Th>المورد</Th><Th>الهاتف</Th><Th>مستحقات علينا (AP)</Th></THead>
          <tbody>
            {data.map((s) => (
              <Tr key={s.id}>
                <Td className="font-bold">{s.name}</Td>
                <Td className="num" dir="ltr">{s.phone ?? "—"}</Td>
                <Td className="num font-bold text-warn">{formatMoney(s.balanceCached ?? "0")}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>مورد جديد</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => create.mutate(v))}>
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
                    <FormLabel>الهاتف (اختياري)</FormLabel>
                    <FormControl><Input inputMode="tel" dir="ltr" className="text-end" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button type="submit" loading={create.isPending}>حفظ</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
