"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { changePassword } from "../api";
import { ApiException } from "@/lib/api/http";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const schema = z
  .object({
    currentPassword: z.string().min(1, "أدخل كلمة المرور الحالية"),
    newPassword: z.string().min(8, "8 أحرف على الأقل"),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "غير متطابقتين" });
type Values = z.infer<typeof schema>;

/** تغيير كلمة المرور الشخصية — متاح لكل مستخدم من الشريط العلوي. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });

  async function submit(v: Values) {
    try {
      await changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      toast("success", "تم تغيير كلمة المرور");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiException && err.status === 401) {
        form.setError("currentPassword", { message: "كلمة المرور الحالية غير صحيحة" });
      } else {
        toast("error", "تعذر تغيير كلمة المرور");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>تغيير كلمة المرور</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)}>
            <DialogBody className="space-y-4">
              <FormField control={form.control} name="currentPassword" render={({ field }) => (
                <FormItem><FormLabel>كلمة المرور الحالية</FormLabel><FormControl><Input type="password" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="newPassword" render={({ field }) => (
                <FormItem><FormLabel>الجديدة</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="confirm" render={({ field }) => (
                <FormItem><FormLabel>تأكيد الجديدة</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button type="submit" loading={form.formState.isSubmitting}>حفظ</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
