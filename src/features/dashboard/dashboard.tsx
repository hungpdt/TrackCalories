"use client";
import { Flame } from "lucide-react";
import { AddMealLink, EmptyState } from "@/components/ui/shared";
import { MealCard } from "@/features/meals/meal-card";
import { WeekStrip } from "./week-strip";
import { sumDay, type DayMeal } from "@/features/meals/types";
import { formatNumber, type Nutrients } from "@/lib/format";

/** Vòng tiến độ SVG; percent 0–100. */
function Ring({ percent, size, stroke, className, children }: { percent: number; size: number; stroke: number; className?: string; children?: React.ReactNode }) {
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  return <span className={`progress-ring ${className ?? ""}`} style={{ width: size, height: size }}>
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="ring-track" />
      <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="ring-value"
        strokeDasharray={length} strokeDashoffset={length * (1 - Math.min(100, Math.max(0, percent)) / 100)} />
    </svg>
    <span className="ring-center">{children}</span>
  </span>;
}

export function Dashboard({ targets: goal, date, today, meals, loggedDays, notice }: {
  targets: Nutrients | null;
  date: string;
  today: string;
  meals: DayMeal[];
  loggedDays: string[];
  notice?: string;
}) {
  const total = sumDay(meals);
  const remaining = goal ? goal.kcal - total.kcal : 0;
  return <div className="home">
    <h1 className="sr-only">Một ngày của bạn</h1>
    <div className="home-top"><WeekStrip date={date} today={today} loggedDays={loggedDays} /><span className="desktop-only"><AddMealLink date={date} /></span></div>
    {notice && <p className="saved-notice" role="status">{notice}</p>}

    <section className="kcal-card" aria-label="Năng lượng trong ngày">
      <div>
        <strong className="kcal-big">{formatNumber(goal ? Math.abs(remaining) : total.kcal)}</strong>
        <span className="kcal-label">{!goal ? "kcal đã nạp" : remaining >= 0 ? "kcal còn lại" : "kcal vượt mục tiêu"}</span>
        {goal && <span className="kcal-sub">Đã nạp {formatNumber(total.kcal)} / {formatNumber(goal.kcal)}</span>}
      </div>
      <Ring percent={goal && goal.kcal > 0 ? total.kcal / goal.kcal * 100 : 0} size={96} stroke={9} className={remaining < 0 ? "over" : ""}><Flame size={24} /></Ring>
    </section>

    <dl className="macro-cards" aria-label="Protein, carb, chất béo còn lại">
      {([["protein", "Đạm"], ["carbs", "Tinh bột"], ["fat", "Chất béo"]] as const).map(([key, label]) => {
        const left = goal ? goal[key] - total[key] : total[key];
        return <div key={key} className={`macro-card-item ${key}${goal && left < 0 ? " over" : ""}`}>
          <dd><strong>{formatNumber(Math.abs(left))}g</strong></dd>
          <dt>{label} {!goal ? "đã nạp" : left < 0 ? "vượt" : "còn"}</dt>
          <Ring percent={goal && goal[key] > 0 ? total[key] / goal[key] * 100 : 0} size={52} stroke={6} />
        </div>;
      })}
    </dl>

    <section className="recent" aria-labelledby="recent-title">
      <div className="section-heading"><h2 id="recent-title">{date === today ? "Hôm nay đã ghi" : "Đã ghi trong ngày"}</h2>{meals.length > 0 && <span className="muted small">Quẹt trái để xóa</span>}</div>
      {meals.length ? <ul className="meal-cards">{meals.map(meal => <MealCard key={meal.id} meal={meal} />)}</ul>
        : <EmptyState title="Chưa có bữa ăn" detail="Bấm nút + để chụp ảnh hoặc ghi món đầu tiên cho ngày này." action={<AddMealLink date={date} />} />}
    </section>
  </div>;
}
