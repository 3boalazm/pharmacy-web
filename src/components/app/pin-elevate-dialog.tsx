"use client";
/**
 * Shared pharmacist PIN-elevation dialog (Contract §2 /auth/pin-elevate).
 * Returns a 120-second override token used for DUR and credit-limit overrides.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api/http";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({ pin: z.string().min(4, "أدخل رمز PIN المكوَّن من 4 أرقام على الأقل") });
type PinForm = z.infer<typeof schema>;

export function PinElevateDialog({
  open, onOpenChange, title = "مصادقة الصيدلي", description, confirmLabel = "مصادقة", onToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  onToken: (overrideToken: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const form = useForm<PinForm>({ resolver: zodResolver(schema), defaultValues: { pin: "" } });

  async function submit(values: PinForm) {
    setBusy(true);
    try {
      const { data } = await api<{ overrideToken: string }>("/auth/pin-elevate", {
        method: "POST",
        body: { pin: values.pin },
      });
      form.reset();
      onToken(data.overrideToken);
    } catch {
      form.setError("pin", { message: "رمز الصيدلي غير صحيح" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader tone="danger">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)}>
            <DialogBody className="space-y-3">
              {description}
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رمز الصيدلي (PIN)</FormLabel>
                    <FormControl>
                      <Input type="password" inputMode="numeric" autoFocus dir="ltr" className="text-center tracking-[0.5em]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-[11px] text-ink-faint">يُسجَّل هذا التجاوز في سجل التدقيق باسمك، وتنتهي صلاحية الإذن خلال 120 ثانية.</p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button type="submit" variant="destructive" loading={busy}>{confirmLabel}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
