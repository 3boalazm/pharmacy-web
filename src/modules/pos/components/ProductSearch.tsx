"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchMedicines, lookupByBarcode, type Medicine } from "@/modules/catalog";
import { usePosStore } from "../store";
import { BatchPeek } from "./BatchPeek";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils/money";
import { ScanBarcode } from "lucide-react";

/**
 * Product Search — cmdk surface over GET /medicines?search=&include=stock (Contract §3).
 * Search by trade name / scientific name / internal code / barcode-scanner input.
 * "/" focuses globally; Enter adds the highlighted item.
 */
export function ProductSearch() {
  const [term, setTerm] = useState("");
  const add = usePosStore((s) => s.add);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const { data, isFetching } = useQuery({
    queryKey: ["medicines.search", term],
    queryFn: ({ signal }) => searchMedicines(term, signal),
    enabled: term.trim().length >= 2,
    select: (r) => r.data,
    placeholderData: (prev) => prev,
  });
  const results = data ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** قارئ USB يكتب الكود ثم Enter. مسار سريع: تطابق محلي فوري إن وُجد.
   *  وإلا lookup مباشر بالباركود (يتفادى سباق نتائج البحث المؤجلة)، مع رسائل واضحة. */
  async function onScanEnter(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    const code = term.trim();
    if (code.length < 4) return;
    e.preventDefault();
    e.stopPropagation();

    // مسار سريع: تطابق موجود في النتائج المحملة
    const local = results.find((m) => m.barcode === code || m.internalCode.toUpperCase() === code.toUpperCase());
    if (local) { pick(local); return; }

    // lookup مباشر بالباركود — لا اعتماد على نتائج بحث قد لم تصل بعد
    try {
      const { data } = await lookupByBarcode(code);
      pick(data);
    } catch {
      toast("error", "لا صنف بهذا الباركود");
    }
  }

  function pick(m: Medicine) {
    if ((m.stock?.onHand ?? 0) <= 0) {
      toast("error", `${m.tradeNameAr}: نفد المخزون`);
      return;
    }
    add(m);
    setTerm("");
    inputRef.current?.focus();
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* cmdk filtering is disabled: the API is the search engine */}
      <Command shouldFilter={false} className="min-h-0 flex-1">
        <div className="relative">
          <CommandInput
            ref={inputRef}
            autoFocus
            value={term}
            onValueChange={setTerm}
            onKeyDown={onScanEnter}
            placeholder="ابحث بالاسم أو الكود أو امسح الباركود…  ( / )"
          />
          <span className="absolute end-3 top-1/2 -translate-y-1/2 rounded-el bg-primary-soft p-1.5 text-primary-ink" title="جاهز للماسح الضوئي">
            <ScanBarcode className="size-4" />
          </span>
        </div>
        <CommandList>
          {term.trim().length < 2 ? (
            <p className="py-14 text-center text-sm text-ink-faint">ابدأ الكتابة للبحث عن دواء — اختصار: /</p>
          ) : (
            <>
              {!isFetching && <CommandEmpty className="py-10 text-center text-sm text-ink-faint">لا توجد نتائج لـ «{term}»</CommandEmpty>}
              {results.map((m) => {
                const out = (m.stock?.onHand ?? 0) <= 0;
                return (
                  <CommandItem key={m.id} value={m.id} disabled={out} onSelect={() => pick(m)}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{m.tradeNameAr}</span>
                      <span className="block truncate text-xs text-ink-faint">{m.scientificName} · {m.form}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {m.requiresPrescription && <Badge tone="blue">روشتة</Badge>}
                      {m.isControlled && <Badge tone="red">مراقب</Badge>}
                      {out ? <Badge tone="red">نفد</Badge> : <Badge tone="green">{m.stock?.onHand} متاح</Badge>}
                      <BatchPeek medicineId={m.id} nameAr={m.tradeNameAr} />
                      <b className="num text-sm">{formatMoney(m.sellPrice)}</b>
                    </span>
                  </CommandItem>
                );
              })}
            </>
          )}
        </CommandList>
      </Command>
    </Card>
  );
}
