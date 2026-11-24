"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, PageHeading } from "@/components/ui/shared";
import { Sheet } from "@/components/ui/sheet";
import { formatDate, formatNumber } from "@/lib/format";
import { looksLikeThousands, parseDecimal } from "@/lib/nutrition/targets";
import { deleteWeight, saveWeight } from "./actions";

import type { WeightEntry } from "./queries";
export type { WeightEntry };
type Range = 7 | 30 | 90 | 0;
type SheetState = { mode: "add" } | { mode: "edit"; entry: WeightEntry } | null;

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const show = (value: number) => String(Math.round(value * 10) / 10).replace(".", ",");
const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${formatNumber(Math.abs(value))}`;

export function WeightTracker({ entries, today, baseline }: {
  entries: WeightEntry[]; today: string; baseline: { goalKcal: number; baselineKg: number } | null;
}) {
  const [range, setRange] = useState<Range>(30);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState("");
  const latest = entries[0];

  // Thay đổi so với số đo gần nhất cách đây ≥ 28 ngày.
  const monthAgo = latest ? entries.find(entry => day(latest.date) - day(entry.date) >= 28) : undefined;
  const points = useMemo(() => {
    if (!latest) return [];
    const from = range ? day(latest.date) - range : -Infinity;
    return entries.filter(entry => day(entry.date) >= from).reverse();
  }, [entries, latest, range]);
  const drift = latest && baseline ? latest.kg - baseline.baselineKg : 0;

  return <>
    <PageHeading eyebrow="TIẾN BỘ THEO CÁCH CỦA BẠN" title="Cân nặng" description="Quan sát xu hướng theo thời gian, thay vì một con số đơn lẻ."
      action={<button type="button" className="button" onClick={() => { setMessage(""); setSheet({ mode: "add" }); }}><Plus size={18} /> Ghi cân nặng</button>} />
    {message && <p className="saved-notice" role="status">{message}</p>}
    {latest && baseline && Math.abs(drift) >= 2 && !dismissed && <div className="recalc-banner" role="note">
      <p>Cân nặng đã {drift < 0 ? "giảm" : "tăng"} {formatNumber(Math.abs(drift))} kg so với lúc đặt mục tiêu ({formatNumber(baseline.baselineKg)} kg). Tính lại mức nạp cho cân nặng mới?</p>
      <div className="sheet-actions">
        <button type="button" className="button secondary" onClick={() => setDismissed(true)}>Để sau</button>
        <Link className="button" href="/#muc-tieu">Tính lại</Link>
      </div>
    </div>}
    {!latest ? <section className="card"><EmptyState title="Chưa có số đo nào" detail="Ghi cân nặng hôm nay để bắt đầu theo dõi xu hướng."
      action={<button type="button" className="button" onClick={() => setSheet({ mode: "add" })}><Plus size={18} /> Ghi cân nặng</button>} /></section>
      : <>
        <section className="card weight-summary">
          <div className="weight-headline">
            <strong>{formatNumber(latest.kg)}<small> kg</small></strong>
            <span className="muted">Số đo {formatDate(latest.date)}{monthAgo ? <> · <b className={latest.kg - monthAgo.kg <= 0 ? "trend-down" : "trend-up"}>{signed(latest.kg - monthAgo.kg)} kg</b> so với {formatDate(monthAgo.date)}</> : null}</span>
          </div>
          <div className="segmented range-switch" role="group" aria-label="Khoảng thời gian">
            {([[7, "7 ngày"], [30, "30 ngày"], [90, "90 ngày"], [0, "Tất cả"]] as const).map(([value, label]) =>
              <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}
          </div>
          <WeightChart points={points} />
        </section>
        <section className="card weight-history">
          <h2>Lịch sử</h2>
          <ul className="weight-list">
            {entries.map(entry => <li key={entry.id}>
              <span>{formatDate(entry.date)}</span>
              <b>{formatNumber(entry.kg)} kg</b>
              <button type="button" className="icon-button" aria-label={`Sửa hoặc xóa số đo ngày ${formatDate(entry.date)}`} onClick={() => { setMessage(""); setSheet({ mode: "edit", entry }); }}><Pencil size={17} /></button>
            </li>)}
          </ul>
        </section>
      </>}
    <Sheet open={Boolean(sheet)} onClose={() => setSheet(null)} title={sheet?.mode === "edit" ? `Số đo ${formatDate(sheet.entry.date)}` : "Ghi cân nặng"}>
      {sheet && <WeightForm key={sheet.mode === "edit" ? sheet.entry.id : "add"} state={sheet} today={today} lastKg={latest?.kg}
        onDone={text => { setSheet(null); setMessage(text); }} />}
    </Sheet>
  </>;
}

function WeightChart({ points }: { points: WeightEntry[] }) {
  if (points.length < 2) return <p className="small muted">Cần ít nhất 2 số đo trong khoảng này để vẽ biểu đồ.</p>;
  const width = 600, height = 200, pad = 28;
  const minDay = day(points[0].date), maxDay = day(points[points.length - 1].date);
  const kgs = points.map(point => point.kg);
  const low = Math.min(...kgs) - 0.5, high = Math.max(...kgs) + 0.5;
  const x = (iso: string) => pad + (maxDay === minDay ? 0.5 : (day(iso) - minDay) / (maxDay - minDay)) * (width - 2 * pad);
  const y = (kg: number) => pad + (high - kg) / (high - low) * (height - 2 * pad);
  const line = points.map(point => `${x(point.date).toFixed(1)},${y(point.kg).toFixed(1)}`).join(" ");
  return <svg viewBox={`0 0 ${width} ${height}`} className="weight-chart" role="img"
    aria-label={`Biểu đồ cân nặng từ ${formatDate(points[0].date)} (${formatNumber(points[0].kg)} kg) đến ${formatDate(points[points.length - 1].date)} (${formatNumber(points[points.length - 1].kg)} kg); số liệu chi tiết ở bảng Lịch sử.`}>
    <line x1={pad} x2={width - pad} y1={y(high - 0.5)} y2={y(high - 0.5)} stroke="#e6ede9" />
    <line x1={pad} x2={width - pad} y1={y(low + 0.5)} y2={y(low + 0.5)} stroke="#e6ede9" />
    <text x={pad} y={y(high - 0.5) - 8} className="chart-label">{formatNumber(high - 0.5)} kg</text>
    <text x={pad} y={y(low + 0.5) + 26} className="chart-label">{formatNumber(low + 0.5)} kg</text>
    <polyline points={line} fill="none" stroke="#147d64" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    {points.map(point => <circle key={point.id} cx={x(point.date)} cy={y(point.kg)} r="4.5" fill="#147d64" stroke="white" strokeWidth="2" />)}
  </svg>;
}

function WeightForm({ state, today, lastKg, onDone }: { state: NonNullable<SheetState>; today: string; lastKg?: number; onDone: (message: string) => void }) {
  const router = useRouter();
  const editing = state.mode === "edit" ? state.entry : null;
  const [date, setDate] = useState(editing?.date ?? today);
  const [value, setValue] = useState(editing ? show(editing.kg) : lastKg ? show(lastKg) : "");
  const [conflict, setConflict] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const kg = value.trim() ? parseDecimal(value) : Number.NaN;

  function submit(replace: boolean) {
    if (looksLikeThousands(value)) { setError("Dùng dấu phẩy cho số thập phân, ví dụ 74,5."); return; }
    if (!(Number.isFinite(kg) && kg >= 20 && kg <= 350)) { setError("Nhập cân nặng từ 20 đến 350 kg, ví dụ 74,5."); return; }
    if (!date) { setError("Chọn ngày."); return; }
    setError("");
    startTransition(async () => {
      try {
        const result = await saveWeight({ date, kg, replace: replace || Boolean(editing) });
        if (result.ok) { router.refresh(); onDone(result.replaced ? `Đã cập nhật ${formatNumber(kg)} kg cho ngày ${formatDate(date)}.` : `Đã lưu ${formatNumber(kg)} kg.`); return; }
        if ("conflict" in result) { setConflict(result.conflict.kg); return; }
        setError(result.error);
      } catch { setError("Mất kết nối, chưa lưu được. Thử lại."); }
    });
  }

  function remove() {
    if (!editing || !window.confirm(`Xóa số đo ${formatNumber(editing.kg)} kg ngày ${formatDate(editing.date)}?`)) return;
    startTransition(async () => {
      try {
        const result = await deleteWeight(editing.id);
        if (!result.ok) { setError("Chưa xóa được. Thử lại."); return; }
        router.refresh();
        onDone(`Đã xóa số đo ngày ${formatDate(editing.date)}.`);
      } catch { setError("Mất kết nối, chưa xóa được. Thử lại."); }
    });
  }

  if (conflict !== null) return <div className="weight-form">
    <p>Ngày {formatDate(date)} đã ghi <b>{formatNumber(conflict)} kg</b>. Thay bằng <b>{formatNumber(kg)} kg</b>?</p>
    <div className="sheet-actions">
      <button type="button" className="button secondary" onClick={() => onDone(`Giữ nguyên ${formatNumber(conflict)} kg cho ngày ${formatDate(date)}.`)}>Giữ {formatNumber(conflict)} kg</button>
      <button type="button" className="button" disabled={pending} onClick={() => submit(true)}>Cập nhật</button>
    </div>
  </div>;

  return <form className="weight-form" noValidate onSubmit={event => { event.preventDefault(); submit(false); }}>
    {!editing && <label className="field">Ngày<input type="date" value={date} max={today} onChange={event => setDate(event.target.value)} /></label>}
    <label className="field">Cân nặng (kg)
      <input className="weight-input" inputMode="decimal" autoFocus value={value} placeholder="Ví dụ 74,5" aria-invalid={error ? true : undefined} onChange={event => setValue(event.target.value)} />
    </label>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="sheet-actions">
      {editing && <button type="button" className="button secondary" disabled={pending} onClick={remove}><Trash2 size={16} /> Xóa</button>}
      <button type="submit" className="button" disabled={pending}>{pending ? "Đang lưu…" : "Lưu"}</button>
    </div>
  </form>;
}
