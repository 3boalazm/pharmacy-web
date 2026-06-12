"use client";
import { useId } from "react";

/** تحجيم قيمة من نطاق إلى آخر. */
function scale(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return outMin;
  return ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0));

/** 📈 Line chart — اتجاه عبر الزمن. يستخدم currentColor (لوّنه عبر className مثل text-primary). */
export function LineChart({
  data, height = 180, valueKey = "value", labelKey = "label",
}: {
  data: Record<string, number | string>[];
  height?: number; valueKey?: string; labelKey?: string;
}) {
  const id = useId();
  const W = 600, H = height, padX = 8, padTop = 12, padBottom = 22;
  const vals = data.map((d) => Number(d[valueKey]) || 0);
  if (data.length === 0) return <Empty />;
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);

  const pts = data.map((d, i) => {
    const x = data.length === 1 ? W / 2 : scale(i, 0, data.length - 1, padX, W - padX);
    const y = scale(Number(d[valueKey]) || 0, min, max, H - padBottom, padTop);
    return [x, y] as const;
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1][0].toFixed(1)} ${H - padBottom} L ${pts[0][0].toFixed(1)} ${H - padBottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-primary" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${id})`} />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="currentColor" />
      ))}
      {/* تسميات المحور السيني (أول/وسط/آخر لتفادي الازدحام) */}
      {data.map((d, i) => {
        if (data.length > 3 && i !== 0 && i !== data.length - 1 && i !== Math.floor(data.length / 2)) return null;
        return (
          <text key={i} x={pts[i][0]} y={H - 6} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 11 }}>
            {String(d[labelKey] ?? "")}
          </text>
        );
      })}
    </svg>
  );
}

/** 📊 Bar chart — مقارنة فئات. */
export function BarChart({
  data, height = 200, valueKey = "value", labelKey = "label",
}: {
  data: Record<string, number | string>[];
  height?: number; valueKey?: string; labelKey?: string;
}) {
  const W = 600, H = height, padTop = 10, padBottom = 40, gap = 10;
  if (data.length === 0) return <Empty />;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  const bw = (W - gap) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-primary" style={{ height }}>
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const bh = scale(v, 0, max, 0, H - padTop - padBottom);
        const x = i * bw + gap / 2, y = H - padBottom - bh;
        const label = String(d[labelKey] ?? "");
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - gap} height={bh} rx="5" fill="currentColor" opacity={0.85} />
            <text x={x + (bw - gap) / 2} y={y - 4} textAnchor="middle" className="fill-ink-soft" style={{ fontSize: 11, fontWeight: 700 }}>{fmt(v)}</text>
            <text x={x + (bw - gap) / 2} y={H - padBottom + 16} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 11 }}>
              {label.length > 10 ? label.slice(0, 9) + "…" : label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const PIE_CLASSES = ["text-primary", "text-info", "text-warn", "text-danger", "text-ink-soft"];
/** 🥧 Donut chart — توزيع. كل شريحة بلون توكن من PIE_CLASSES. */
export function PieChart({
  data, size = 160, valueKey = "value", labelKey = "label",
}: {
  data: Record<string, number | string>[];
  size?: number; valueKey?: string; labelKey?: string;
}) {
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  if (total === 0) return <Empty />;
  const r = 60, cx = 80, cy = 80, circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 160 160" style={{ width: size, height: size }} className="-rotate-90">
        {data.map((d, i) => {
          const v = Number(d[valueKey]) || 0;
          const frac = v / total;
          const dash = frac * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" strokeWidth="20"
              className={PIE_CLASSES[i % PIE_CLASSES.length]} stroke="currentColor"
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={`size-3 rounded-full ${PIE_CLASSES[i % PIE_CLASSES.length]}`} style={{ backgroundColor: "currentColor" }} />
            <span className="text-ink-soft">{String(d[labelKey] ?? "")}</span>
            <span className="num font-bold">{(((Number(d[valueKey]) || 0) / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="flex h-32 items-center justify-center text-sm text-ink-faint">لا بيانات كافية للرسم</div>;
}
