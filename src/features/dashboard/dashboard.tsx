"use client";
import { useState } from "react";
import Link from "next/link";
import { Flame, ScanLine, Sparkles, TrendingDown, Settings2 } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { PageHeading, AddMealLink, DatePicker, MealList, EmptyState } from "@/components/ui/shared";
import { DEMO_DATE, sumMeals, formatNumber, type Nutrients } from "@/lib/demo/data";
export function Dashboard({ targets: goal }: { targets: Nutrients }) {
  const { meals, weights } = useDemo();
  const goalLabel = "mục tiêu của bạn";
  const [date, setDate] = useState(DEMO_DATE);
  const todayMeals = meals.filter(meal => meal.date === date);
  const total = sumMeals(todayMeals);
  const remaining = goal.kcal - total.kcal;
  const progress = goal.kcal > 0 ? Math.min(100, total.kcal / goal.kcal * 100) : 0;
  const latestWeight = [...weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  return <>
    <PageHeading eyebrow="MỖI NGÀY, MỘT CHÚT TỐT HƠN" title="Một ngày của bạn" description="Cùng nhìn lại những gì bạn đã nạp vào cơ thể." action={<><DatePicker value={date} onChange={setDate} /><AddMealLink /></>} />
    <div className="dashboard-grid">
      <section className="card energy-card"><div className="section-heading"><h2><Flame size={20} /> Năng lượng trong ngày</h2><span className="tag">Minh họa</span></div><div className="energy-content"><div className="calorie-ring" style={{ background: `conic-gradient(var(--accent) ${progress}%, #e6ede9 0)` }}><div><span className="muted small">Đã nạp</span><strong>{formatNumber(total.kcal)}</strong><span className="muted">/ {formatNumber(goal.kcal)} kcal</span></div></div><div className="energy-detail"><span className="muted">{remaining >= 0 ? "Còn lại theo " + goalLabel : "Vượt " + goalLabel}</span><p className={remaining < 0 ? "over-goal" : ""}><strong>{formatNumber(Math.abs(remaining))}</strong> kcal</p><span className="small muted">So sánh với nhật ký minh họa.</span></div></div><div className="energy-footer"><span className="status-dot" />{todayMeals.length} món đã ghi trong ngày<Link href="#muc-tieu">Xem mục tiêu</Link></div></section>
      <section className="card macro-card"><div className="section-heading"><h2>Dinh dưỡng đa lượng</h2><span className="muted small">gram</span></div>{([{ key: "protein", label: "Protein", className: "protein" }, { key: "carbs", label: "Carbs", className: "carbs" }, { key: "fat", label: "Chất béo", className: "fat" }] as const).map(({ key, label, className }) => <div className={`macro ${className}`} key={key}><div><strong><span className="macro-dot" />{label}</strong><span><b>{formatNumber(total[key])}</b><span className="muted"> / {formatNumber(goal[key])} g</span></span></div><div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={goal[key]} aria-valuenow={Math.min(total[key], goal[key])} aria-valuetext={`${formatNumber(total[key])} trên ${goalLabel} ${formatNumber(goal[key])} gram`}><span style={{ width: `${goal[key] > 0 ? Math.min(100, total[key] / goal[key] * 100) : 0}%` }} /></div></div>)}<p className="macro-note">Một bữa ăn cân bằng bắt đầu từ việc hiểu những gì mình ăn.</p></section>
      <section className="card daily-meals"><div className="section-heading"><h2>Bữa ăn trong ngày <span className="count">{todayMeals.length}</span></h2><Link href="/history" className="text-link">Xem nhật ký</Link></div>{todayMeals.length ? <MealList meals={todayMeals} /> : <EmptyState title="Chưa có bữa ăn" detail="Thêm món đầu tiên cho ngày bạn đang xem." action={<AddMealLink />} />}<Link href="/add-meal" className="dashed-button">+ Thêm một bữa ăn</Link></section>
      <div className="dashboard-side"><section className="quick-card"><span className="quick-icon"><ScanLine size={25} /></span><h2>Ghi nhanh, nhẹ đầu</h2><p>Chọn món quen thuộc hoặc khám phá cách ghi bữa bằng ảnh và giọng nói.</p><Link href="/add-meal" className="button white-button">Khám phá cách thêm món</Link><Sparkles className="quick-decoration" size={86} aria-hidden="true" /></section><section className="card weight-mini"><span className="muted small">CÂN NẶNG MẪU GẦN NHẤT</span><div><strong>{latestWeight ? formatNumber(latestWeight.value) : "—"}<small> kg</small></strong><TrendingDown size={28} /></div><Link href="/weight" className="text-link">Xem hành trình cân nặng</Link></section></div>
    </div><footer className="page-footer"><span>Số liệu chỉ dùng để minh họa giao diện.</span><Link href="/settings"><Settings2 size={16} /> Cài đặt</Link></footer>
  </>;
}
