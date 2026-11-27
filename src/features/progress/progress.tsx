"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTargetWeight } from "@/features/weight/actions";
import { applyAdaptiveTarget } from "@/features/goals/actions";
import { adaptiveTdee, ADAPTIVE_WINDOW } from "@/lib/nutrition/adaptive";
import { looksLikeThousands, parseDecimal } from "@/lib/nutrition/targets";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Flame } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";
import type { WeightEntry } from "@/features/weight/queries";
import type { DayTotal } from "./queries";

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
function shift(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const mondayOf = (date: string) => shift(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const weekdayShort = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Chuỗi ngày + số ngày ghi trong tuần này (trên cùng trang Tiến độ). */
export function ProgressCards({ streak, loggedDays, today }: {
  streak: { days: number; today: boolean }; loggedDays: string[]; today: string;
}) {
  const monday = mondayOf(today);
  const logged = new Set(loggedDays);
  const thisWeek = Array.from({ length: 7 }, (_, index) => shift(monday, index));
  return <div className="progress-top">
    <section className="progress-card streak-card" id="chuoi-ngay" aria-label="Chuỗi ngày ghi bữa">
      <Flame size={40} className={streak.days ? "lit" : ""} aria-hidden="true" />
      <strong>{streak.days}</strong>
      <span>ngày liên tiếp</span>
      <ol className="streak-dots" aria-label="Tuần này">
        {thisWeek.map((day, index) => <li key={day} className={`${logged.has(day) ? "on" : ""}${day === today ? " today" : ""}`}>
          <span>{weekdayShort[index]}</span><i aria-label={logged.has(day) ? "đã ghi" : "chưa ghi"} />
        </li>)}
      </ol>
    </section>
    <section className="progress-card streak-side" aria-label="Ghi chép tuần này">
      <strong>{thisWeek.filter(day => logged.has(day)).length}<small>/7</small></strong>
      <span>ngày đã ghi tuần này</span>
      <p className="muted small">{streak.today ? "Hôm nay đã ghi, giữ lửa nhé!" : "Ghi một bữa hôm nay để giữ chuỗi."}</p>
    </section>
  </div>;
}

/** Số đo gần nhất vào hoặc trước ngày. */
function weightOn(entries: WeightEntry[], date: string) {
  return entries.find(entry => entry.date <= date);
}

function Change({ value, unit, neutral = 0.05, lowerIsGood = true }: { value: number | null; unit: string; neutral?: number; lowerIsGood?: boolean }) {
  if (value === null) return <span className="change muted">Chưa đủ dữ liệu</span>;
  const flat = Math.abs(value) < neutral;
  const Icon = flat ? ArrowRight : value > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = flat ? "" : (value < 0) === lowerIsGood ? " good" : " bad";
  return <span className={`change${tone}`}>
    <b>{value > 0 ? "+" : value < 0 ? "−" : ""}{formatNumber(Math.abs(value))} {unit}</b>
    <Icon size={16} aria-hidden="true" />
    <span>{flat ? "Không đổi" : value > 0 ? "Tăng" : "Giảm"}</span>
  </span>;
}

const periods = [[3, "3 ngày"], [7, "7 ngày"], [14, "14 ngày"], [30, "30 ngày"], [90, "90 ngày"], [0, "Từ đầu"]] as const;

export function EnergyCards({ totals, today, entries, heightCm, targetKg, goalKcal = null, weeklyKcal = 0 }: {
  totals: DayTotal[]; today: string; entries: WeightEntry[]; heightCm: number | null; targetKg?: number | null;
  goalKcal?: number | null; weeklyKcal?: number;
}) {
  const latest = entries[0];
  const first = entries[entries.length - 1];
  return <>
    {latest && <GoalCard latest={latest} start={first} targetKg={targetKg ?? null} today={today} />}
    {latest && <section className="progress-card" aria-labelledby="weight-changes">
      <h2 id="weight-changes">Thay đổi cân nặng</h2>
      <ul className="change-list">
        {periods.map(([days, label]) => {
          const past = days ? weightOn(entries, shift(latest.date, -days)) : first;
          const value = past && past !== latest ? latest.kg - past.kg : null;
          return <li key={label}><span>{label}</span><Change value={value} unit="kg" /></li>;
        })}
      </ul>
    </section>}
    <AdaptiveCard totals={totals} today={today} entries={entries} goalKcal={goalKcal} weeklyKcal={weeklyKcal} />
    <CaloriesCard totals={totals} today={today} />
    <EnergyChanges totals={totals} today={today} />
    {latest && heightCm && <BmiCard kg={latest.kg} heightCm={heightCm} />}
  </>;
}

function GoalCard({ latest, start, targetKg, today }: { latest: WeightEntry; start: WeightEntry; targetKg: number | null; today: string }) {
  const nextIn = Math.max(0, 7 - (dayNumber(today) - dayNumber(latest.date)));
  const span = targetKg !== null ? start.kg - targetKg : 0;
  const percent = targetKg !== null && span !== 0 ? Math.max(0, Math.min(100, (start.kg - latest.kg) / span * 100)) : 0;
  return <section className="progress-card goal-card" aria-label="Cân nặng hiện tại">
    <div className="goal-card-top">
      <div><span className="muted small">Cân nặng hiện tại</span><strong>{formatNumber(latest.kg)} kg</strong></div>
      <span className="pill">{nextIn === 0 ? "Đến lúc cân lại" : `Cân lại sau ${nextIn} ngày`}</span>
    </div>
    {targetKg !== null ? <>
      <div className="goal-bar" role="progressbar" aria-label="Tiến tới cân nặng mục tiêu" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><i style={{ width: `${percent}%` }} /></div>
      <div className="goal-ends"><span>Bắt đầu<br /><b>{formatNumber(start.kg)} kg</b></span><span className="goal-percent">{Math.round(percent)}% mục tiêu</span><span>Mục tiêu<br /><b>{formatNumber(targetKg)} kg</b></span></div>
    </> : <p className="muted small">Bắt đầu {formatNumber(start.kg)} kg ({formatDate(start.date)}). Đặt cân nặng mục tiêu để xem % tiến độ.</p>}
    <TargetForm targetKg={targetKg} today={today} />
  </section>;
}

function TargetForm({ targetKg, today }: { targetKg: number | null; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(targetKg === null ? "" : String(targetKg).replace(".", ","));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  if (!open) return <button type="button" className="text-button" onClick={() => setOpen(true)}>{targetKg === null ? "Đặt cân nặng mục tiêu" : "Đổi mục tiêu"}</button>;
  function submit() {
    const kg = value.trim() ? parseDecimal(value) : null;
    if (looksLikeThousands(value) || (kg !== null && !(Number.isFinite(kg) && kg >= 20 && kg <= 350))) { setError("Nhập từ 20 đến 350 kg, ví dụ 72,5."); return; }
    startTransition(async () => {
      try {
        const result = await setTargetWeight({ kg, today });
        if (!result.ok) { setError("Chưa lưu được. Hãy thiết lập mục tiêu dinh dưỡng trước."); return; }
        setOpen(false); setError(""); router.refresh();
      } catch { setError("Mất kết nối, chưa lưu được."); }
    });
  }
  return <form className="target-form" noValidate onSubmit={event => { event.preventDefault(); submit(); }}>
    <label className="field">Cân nặng mục tiêu (kg)<input inputMode="decimal" value={value} placeholder="Ví dụ 72,5" autoFocus onChange={event => setValue(event.target.value)} aria-invalid={error ? true : undefined} /></label>
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="sheet-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Hủy</button><button className="button" disabled={pending}>Lưu</button></div>
  </form>;
}

/** TDEE thực tế từ lượng ăn đã ghi và xu hướng cân nặng 21 ngày gần nhất; chỉ gợi ý, người dùng tự bấm áp dụng. */
function AdaptiveCard({ totals, today, entries, goalKcal, weeklyKcal }: {
  totals: DayTotal[]; today: string; entries: WeightEntry[]; goalKcal: number | null; weeklyKcal: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const result = adaptiveTdee({ today, intake: totals, weights: entries });
  const estimated = goalKcal === null ? null : Math.round(goalKcal - weeklyKcal / 7);
  const suggested = result.ok ? Math.round(result.tdee + weeklyKcal / 7) : null;

  function apply() {
    if (!result.ok) return;
    startTransition(async () => {
      try {
        const saved = await applyAdaptiveTarget({ tdee: result.tdee, today });
        setMessage(saved.ok ? "Đã cập nhật mục tiêu từ hôm nay." : saved.error);
        if (saved.ok) router.refresh();
      } catch { setMessage("Mất kết nối, chưa lưu được. Thử lại."); }
    });
  }

  return <section className="progress-card" aria-labelledby="adaptive-tdee">
    <h2 id="adaptive-tdee">TDEE thực tế</h2>
    {!result.ok ? <>
      <p className="muted small">Tính từ lượng ăn bạn ghi và xu hướng cân nặng trong {ADAPTIVE_WINDOW} ngày gần nhất, sát cơ thể bạn hơn mọi công thức.</p>
      <p className="small">Cần thêm dữ liệu: {result.loggedDays}/{result.needDays} ngày ghi bữa, {result.weighIns}/{result.needWeighIns} lần cân (cách nhau ít nhất 10 ngày).</p>
    </> : <>
      <p className="big-number">≈ {formatNumber(result.tdee)} <small>kcal/ngày</small></p>
      <p className="muted small">{result.loggedDays} ngày ghi bữa, ăn trung bình {formatNumber(result.avgIntake)} kcal; cân nặng {result.kgPerWeek <= 0 ? "giảm" : "tăng"} {formatNumber(Math.abs(result.kgPerWeek))} kg/tuần ({formatDate(result.from)}–{formatDate(result.to)}).</p>
      {estimated !== null && <p className="small">Mức duy trì trong mục tiêu hiện tại: {formatNumber(estimated)} kcal/ngày ({result.tdee - estimated >= 0 ? "+" : "−"}{formatNumber(Math.abs(result.tdee - estimated))}).</p>}
      <p className="muted small">Ngày ghi thiếu món sẽ làm số này thấp hơn thực tế.</p>
      {suggested !== null && goalKcal !== null && Math.abs(suggested - goalKcal) >= 100 && <div className="sheet-actions">
        <button type="button" className="button" disabled={pending} onClick={apply}>{pending ? "Đang lưu…" : `Đặt mục tiêu ${formatNumber(suggested)} kcal`}</button>
      </div>}
    </>}
    {message && <p className="small" role="status">{message}</p>}
  </section>;
}

function CaloriesCard({ totals, today }: { totals: DayTotal[]; today: string }) {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const monday = shift(mondayOf(today), -7 * weeksAgo);
  const byDate = new Map(totals.map(total => [total.date, total]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = shift(monday, index);
    const total = byDate.get(date);
    return { date, label: weekdayShort[index], protein: (total?.protein ?? 0) * 4, carbs: (total?.carbs ?? 0) * 4, fat: (total?.fat ?? 0) * 9, kcal: total?.kcal ?? 0 };
  });
  const loggedDays = days.filter(day => day.kcal > 0);
  const average = loggedDays.length ? loggedDays.reduce((sum, day) => sum + day.kcal, 0) / loggedDays.length : 0;
  const max = Math.max(500, ...days.map(day => day.protein + day.carbs + day.fat));
  return <section className="progress-card" aria-labelledby="avg-calories">
    <h2 id="avg-calories">Calo trung bình mỗi ngày</h2>
    <p className="big-number">{formatNumber(Math.round(average))} <small>kcal</small></p>
    <div className="bar-chart" role="img" aria-label={`Calo từng ngày tuần ${weeksAgo === 0 ? "này" : `${weeksAgo} tuần trước`}: ${days.map(day => `${day.label} ${Math.round(day.kcal)} kcal`).join(", ")}`}>
      {days.map(day => <div key={day.date} className="bar-col">
        <div className="bar-stack">
          {(["fat", "carbs", "protein"] as const).map(key => <i key={key} className={key} style={{ height: `${day[key] / max * 100}%` }} />)}
        </div>
        <span className={day.date === today ? "today" : ""}>{day.label}</span>
      </div>)}
    </div>
    <div className="chart-legend"><span className="protein"><i />Đạm</span><span className="carbs"><i />Tinh bột</span><span className="fat"><i />Chất béo</span></div>
    <div className="segmented week-tabs" role="group" aria-label="Chọn tuần">
      {["Tuần này", "Tuần trước", "2 tuần trước", "3 tuần trước"].map((label, index) =>
        <button key={label} type="button" aria-pressed={weeksAgo === index} onClick={() => setWeeksAgo(index)}>{label}</button>)}
    </div>
  </section>;
}

/** Calo trung bình/ngày (chỉ tính ngày có ghi) trong N ngày gần nhất so với N ngày trước đó. */
function EnergyChanges({ totals, today }: { totals: DayTotal[]; today: string }) {
  const average = (from: string, to: string) => {
    const days = totals.filter(total => total.date > from && total.date <= to);
    return days.length ? days.reduce((sum, day) => sum + day.kcal, 0) / days.length : null;
  };
  return <section className="progress-card" aria-labelledby="energy-changes">
    <h2 id="energy-changes">Thay đổi năng lượng nạp</h2>
    <p className="muted small">Calo trung bình mỗi ngày có ghi, so với khoảng liền trước.</p>
    <ul className="change-list">
      {periods.filter(([days]) => days > 0).map(([days, label]) => {
        const now = average(shift(today, -days), today);
        const before = average(shift(today, -2 * days), shift(today, -days));
        return <li key={label}><span>{label}</span><span className="muted small">{now === null ? "—" : `${formatNumber(Math.round(now))} kcal`}</span>
          <Change value={now !== null && before !== null ? Math.round(now - before) : null} unit="kcal" neutral={1} /></li>;
      })}
    </ul>
  </section>;
}

function BmiCard({ kg, heightCm }: { kg: number; heightCm: number }) {
  const bmi = kg / (heightCm / 100) ** 2;
  const [label, tone] = bmi < 18.5 ? ["Thiếu cân", "under"] : bmi < 25 ? ["Bình thường", "healthy"] : bmi < 30 ? ["Thừa cân", "over"] : ["Béo phì", "obese"];
  // Thang 15–35 trải trên thanh màu.
  const position = Math.max(0, Math.min(100, (bmi - 15) / 20 * 100));
  return <section className="progress-card" aria-labelledby="bmi-title">
    <h2 id="bmi-title">Chỉ số BMI</h2>
    <p className="bmi-value"><strong>{formatNumber(Math.round(bmi * 10) / 10)}</strong> <span className={`bmi-tag ${tone}`}>{label}</span></p>
    <div className="bmi-bar" aria-hidden="true"><i style={{ left: `${position}%` }} /></div>
    <div className="bmi-legend"><span className="under">Thiếu cân &lt;18,5</span><span className="healthy">Bình thường</span><span className="over">Thừa cân ≥25</span><span className="obese">Béo phì ≥30</span></div>
    <p className="muted small">BMI chỉ là ước lượng, không phản ánh tỉ lệ cơ/mỡ.</p>
  </section>;
}
