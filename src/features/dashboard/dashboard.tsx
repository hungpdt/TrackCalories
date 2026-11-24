"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, ScanLine, Sparkles, TrendingDown, Settings2 } from "lucide-react";
import { PageHeading, AddMealLink, DatePicker, EmptyState, addMealHref } from "@/components/ui/shared";
import { DayMeals } from "@/features/meals/day-meals";
import { sumDay, type DayMeal } from "@/features/meals/types";
import { formatNumber, type Nutrients } from "@/lib/format";

export function Dashboard({ targets: goal, date, meals, latestWeight }: {
  targets: Nutrients | null;
  date: string;
  meals: DayMeal[];
  latestWeight: { kg: number; date: string } | null;
}) {
  const router = useRouter();
  const goalLabel = "mục tiêu của bạn";
  const total = sumDay(meals);
  const itemCount = meals.reduce((count, meal) => count + meal.items.length, 0);
  // Ngày trước mục tiêu đầu tiên: chỉ hiện tổng đã ăn, không tạo mục tiêu giả.
  const remaining = goal ? goal.kcal - total.kcal : 0;
  const progress = goal && goal.kcal > 0 ? Math.min(100, total.kcal / goal.kcal * 100) : 0;
  return <>
    <PageHeading eyebrow="MỖI NGÀY, MỘT CHÚT TỐT HƠN" title="Một ngày của bạn" description="Cùng nhìn lại những gì bạn đã nạp vào cơ thể."
      action={<><DatePicker value={date} onChange={value => router.push(`/?date=${value}`)} /><AddMealLink date={date} /></>} />
    <div className="dashboard-grid">
      <section className="card energy-card">
        <div className="section-heading"><h2><Flame size={20} /> Năng lượng trong ngày</h2></div>
        <div className="energy-content">
          <div className="calorie-ring" style={{ background: `conic-gradient(var(--accent) ${progress}%, #e6ede9 0)` }}>
            <div><span className="muted small">Đã nạp</span><strong>{formatNumber(total.kcal)}</strong><span className="muted">{goal ? `/ ${formatNumber(goal.kcal)} kcal` : "kcal"}</span></div>
          </div>
          <div className="energy-detail">
            {goal ? <>
              <span className="muted">{remaining >= 0 ? "Còn lại theo " + goalLabel : "Vượt " + goalLabel}</span>
              <p className={remaining < 0 ? "over-goal" : ""}><strong>{formatNumber(Math.abs(remaining))}</strong> kcal</p>
            </> : <span className="muted">Ngày này chưa có mục tiêu đang hiệu lực.</span>}
            <span className="small muted">Tổng từ các món đã lưu trong ngày.</span>
          </div>
        </div>
        {goal && <dl className="macro-remaining" aria-label="Protein, carb, chất béo còn lại trong ngày">
          {([["protein", "Protein"], ["carbs", "Carb"], ["fat", "Chất béo"]] as const).map(([key, label]) => {
            const left = goal[key] - total[key];
            // Ghi rõ "còn lại"/"vượt" bằng chữ, không chỉ dựa vào màu.
            return <div key={key} className={`${key}${left < 0 ? " over" : ""}`}>
              <dt><span className="macro-dot" aria-hidden="true" />{label}</dt>
              <dd><strong>{formatNumber(Math.abs(left))} g</strong> <span>{left < 0 ? "vượt" : "còn lại"}</span></dd>
              <span className="mini-bar" aria-hidden="true"><i style={{ width: `${goal[key] > 0 ? Math.min(100, total[key] / goal[key] * 100) : 0}%` }} /></span>
            </div>;
          })}
        </dl>}
        <div className="energy-footer"><span className="status-dot" />{itemCount} món đã ghi trong ngày<Link href="#muc-tieu" onClick={() => document.getElementById("muc-tieu-toggle")?.setAttribute("open", "")}>Xem mục tiêu</Link></div>
      </section>
      <section className="card macro-card">
        <div className="section-heading"><h2>Dinh dưỡng đa lượng</h2><span className="muted small">gram</span></div>
        {([{ key: "protein", label: "Protein", className: "protein" }, { key: "carbs", label: "Carbs", className: "carbs" }, { key: "fat", label: "Chất béo", className: "fat" }] as const).map(({ key, label, className }) =>
          <div className={`macro ${className}`} key={key}>
            <div><strong><span className="macro-dot" />{label}</strong><span><b>{formatNumber(total[key])}</b>{goal && <span className="muted"> / {formatNumber(goal[key])} g</span>}</span></div>
            <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={goal?.[key] ?? 0} aria-valuenow={goal ? Math.min(total[key], goal[key]) : 0}
              aria-valuetext={goal ? `${formatNumber(total[key])} trên ${goalLabel} ${formatNumber(goal[key])} gram` : `${formatNumber(total[key])} gram`}>
              <span style={{ width: `${goal && goal[key] > 0 ? Math.min(100, total[key] / goal[key] * 100) : 0}%` }} />
            </div>
          </div>)}
        <p className="macro-note">Một bữa ăn cân bằng bắt đầu từ việc hiểu những gì mình ăn.</p>
      </section>
      <section className="card daily-meals">
        <div className="section-heading"><h2>Bữa ăn trong ngày <span className="count">{meals.length}</span></h2><Link href={`/history?date=${date}`} className="text-link">Xem nhật ký</Link></div>
        {meals.length ? <DayMeals meals={meals} /> : <EmptyState title="Chưa có bữa ăn" detail="Chụp ảnh hoặc ghi chú món đầu tiên cho ngày bạn đang xem." action={<AddMealLink date={date} />} />}
        <Link href={addMealHref(date)} className="dashed-button">+ Thêm một bữa ăn</Link>
      </section>
      <div className="dashboard-side">
        <section className="quick-card"><span className="quick-icon"><ScanLine size={25} /></span><h2>Ghi nhanh, nhẹ đầu</h2><p>Chụp ảnh bữa ăn và nói thêm vài chữ, AI tạo bản nháp để bạn kiểm tra.</p><Link href={addMealHref(date)} className="button white-button">Ghi nhanh bằng ảnh</Link><Sparkles className="quick-decoration" size={86} aria-hidden="true" /></section>
        <section className="card weight-mini"><span className="muted small">CÂN NẶNG GẦN NHẤT</span><div><strong>{latestWeight ? formatNumber(latestWeight.kg) : "—"}<small> kg</small></strong><TrendingDown size={28} /></div><Link href="/weight" className="text-link">Xem hành trình cân nặng</Link></section>
      </div>
    </div>
    <footer className="page-footer"><span>Calories và macro là ước tính; hãy kiểm tra món AI đánh dấu cần xem lại.</span><Link href="/settings"><Settings2 size={16} /> Cài đặt</Link></footer>
  </>;
}
