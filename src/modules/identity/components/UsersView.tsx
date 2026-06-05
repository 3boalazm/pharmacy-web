"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listUsers, createUser, updateUser, type ManagedUser } from "../api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getSession } from "@/lib/auth/session";
import { UserPlus, KeyRound, Pencil } from "lucide-react";

const roleAr = { OWNER: "مالك", PHARMACIST: "صيدلي", ASSISTANT: "مساعد صيدلي", CASHIER: "كاشير" } as const;
const roleTone = { OWNER: "green", PHARMACIST: "blue", ASSISTANT: "amber", CASHIER: "gray" } as const;

const createSchema = z.object({
  name: z.string().min(3, "الاسم 3 أحرف على الأقل"),
  phone: z.string().regex(/^01\d{9}$/, "رقم موبايل صحيح (11 رقمًا)"),
  password: z.string().min(8, "8 أحرف على الأقل"),
  role: z.enum(["PHARMACIST", "ASSISTANT", "CASHIER"]),
  pin: z.string().regex(/^\d{4,6}$/).optional().or(z.literal("")),
});
type CreateValues = z.infer<typeof createSchema>;

/** إدارة المستخدمين — OWNER only (الراوت محمي في الخادم؛ القائمة الجانبية تخفيه عن غيره). */
export function UsersView() {
  const toast = useToast();
  const qc = useQueryClient();
  const me = getSession()?.user;
  const [addOpen, setAddOpen] = useState(false);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: ({ signal }) => listUsers(signal), select: (r) => r.data });

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", phone: "", password: "", role: "CASHIER", pin: "" },
  });
  const create = useMutation({
    mutationFn: (v: CreateValues) =>
      createUser({ ...v, pin: v.pin || undefined }),
    onSuccess: () => {
      toast("success", "تم إنشاء الحساب");
      form.reset(); setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });
  const toggleArchive = useMutation({
    mutationFn: (u: ManagedUser) => updateUser(u.id, { archived: !u.archivedAt }),
    onSuccess: () => { toast("success", "تم التحديث"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: Error) => toast("error", e.message),
  });

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm text-ink-soft">الحسابات تُنشأ من هنا فقط — لا يوجد تسجيل عام (نظام داخلي).</p>
        <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="size-4" /> مستخدم جديد</Button>
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-sm text-ink-faint">جارٍ التحميل…</p>
      ) : (
        <Table>
          <THead><Th>الاسم</Th><Th>الهاتف</Th><Th>الدور</Th><Th>الحالة</Th><Th></Th></THead>
          <tbody>
            {(data ?? []).map((u) => (
              <Tr key={u.id}>
                <Td className="font-bold">{u.name}{u.id === me?.id && <Badge tone="blue" className="ms-2">أنت</Badge>}</Td>
                <Td className="num" dir="ltr">{u.phone}</Td>
                <Td><Badge tone={roleTone[u.role]}>{roleAr[u.role]}</Badge></Td>
                <Td>{u.archivedAt ? <Badge tone="red">معطَّل</Badge> : <Badge tone="green">نشط</Badge>}</Td>
                <Td>
                  <span className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setResetUser(u)}>
                      <KeyRound className="size-3.5" /> إعادة تعيين كلمة المرور
                    </Button>
                    {u.id !== me?.id && (
                      <Button size="sm" variant="ghost" onClick={() => toggleArchive.mutate(u)}>
                        <Pencil className="size-3.5" /> {u.archivedAt ? "تفعيل" : "تعطيل"}
                      </Button>
                    )}
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add user */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>مستخدم جديد</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => create.mutate(v))}>
              <DialogBody className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>الاسم</FormLabel><FormControl><Input autoFocus {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>رقم الهاتف (اسم الدخول)</FormLabel><FormControl><Input inputMode="tel" dir="ltr" className="text-end" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>كلمة المرور المبدئية</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدور</FormLabel>
                    <FormControl>
                      <select {...field} className="h-10 w-full rounded-el border border-line bg-card px-3 text-sm focus:border-primary focus-visible:outline-none">
                        <option value="CASHIER">كاشير — بيع وتحصيل فقط</option>
                        <option value="ASSISTANT">مساعد صيدلي — + مخزون واستلام</option>
                        <option value="PHARMACIST">صيدلي — + تجاوزات سريرية وكتالوج</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="pin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رمز PIN (للصيدلي فقط — اختياري)</FormLabel>
                    <FormControl><Input inputMode="numeric" dir="ltr" className="num text-center tracking-[0.4em]" maxLength={6} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>إلغاء</Button>
                <Button type="submit" loading={create.isPending}>إنشاء الحساب</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />
    </Card>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: ManagedUser | null; onClose: () => void }) {
  const toast = useToast();
  const schema = z.object({ password: z.string().min(8, "8 أحرف على الأقل") });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: "" } });
  const reset = useMutation({
    mutationFn: (v: { password: string }) => updateUser(user!.id, { password: v.password }),
    onSuccess: () => { toast("success", `تم تغيير كلمة مرور ${user!.name}`); form.reset(); onClose(); },
    onError: (e: Error) => toast("error", e.message),
  });
  if (!user) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>إعادة تعيين كلمة مرور — {user.name}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => reset.mutate(v))}>
            <DialogBody className="space-y-3">
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>كلمة المرور الجديدة</FormLabel><FormControl><Input type="password" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <p className="text-[11px] text-ink-faint">يُسجَّل هذا الإجراء في سجل التدقيق باسمك.</p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
              <Button type="submit" loading={reset.isPending}>تغيير</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
