"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { createMedicine } from "../api";
import { zMoney } from "@/lib/zod/common";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  tradeNameAr: z.string().min(2, "أدخل الاسم التجاري بالعربية"),
  tradeName: z.string().min(2, "أدخل الاسم التجاري بالإنجليزية"),
  scientificName: z.string().min(2, "أدخل المادة الفعالة"),
  form: z.string().min(2, "مثال: TABLET / SYRUP"),
  company: z.string().optional(),
  internalCode: z.string().min(3, "كود داخلي فريد"),
  barcode: z.string().optional(),
  sellPrice: zMoney,
  minStockLevel: z.coerce.number().int().min(0),
  requiresPrescription: z.boolean(),
  isControlled: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function CreateMedicineDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void;
}) {
  const toast = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { minStockLevel: 5, requiresPrescription: false, isControlled: false },
  });

  const create = useMutation({
    mutationFn: (v: FormValues) => createMedicine(v),
    onSuccess: () => { toast("success", "تمت إضافة المنتج"); form.reset(); onCreated(); },
    onError: (e: Error) => toast("error", e.message),
  });

  const textFields = [
    { name: "tradeNameAr", label: "الاسم التجاري (عربي)", ph: "أوجمنتين ١ جم" },
    { name: "tradeName", label: "الاسم التجاري (EN)", ph: "Augmentin 1g" },
    { name: "scientificName", label: "المادة الفعالة", ph: "Amoxicillin/Clavulanate" },
    { name: "form", label: "الشكل الصيدلي", ph: "TABLET" },
    { name: "company", label: "الشركة", ph: "GSK" },
    { name: "internalCode", label: "الكود الداخلي", ph: "MED-000123" },
    { name: "barcode", label: "الباركود (اختياري)", ph: "" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>منتج جديد</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))}>
            <DialogBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {textFields.map(({ name, label, ph }) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl><Input placeholder={ph} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="sellPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>سعر البيع (ج.م)</FormLabel>
                  <FormControl><Input inputMode="decimal" dir="ltr" className="num text-end" placeholder="98.00" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="minStockLevel" render={({ field }) => (
                <FormItem>
                  <FormLabel>حد الأمان (تنبيه نقص)</FormLabel>
                  <FormControl><Input type="number" min={0} dir="ltr" className="num text-end" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="requiresPrescription" render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0 rounded-el border border-line px-3 py-2.5">
                  <FormLabel className="cursor-pointer">يتطلب روشتة</FormLabel>
                  <FormControl><input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="size-4 accent-[--c-primary]" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="isControlled" render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0 rounded-el border border-line px-3 py-2.5">
                  <FormLabel className="cursor-pointer">صنف مراقب</FormLabel>
                  <FormControl><input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="size-4 accent-[--c-primary]" /></FormControl>
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button type="submit" loading={create.isPending}>حفظ المنتج</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
