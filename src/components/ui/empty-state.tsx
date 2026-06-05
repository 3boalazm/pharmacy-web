export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-14 text-center">
      <div className="text-3xl">💊</div>
      <p className="font-semibold text-ink-soft">{title}</p>
      {hint && <p className="text-sm text-ink-faint">{hint}</p>}
    </div>
  );
}
