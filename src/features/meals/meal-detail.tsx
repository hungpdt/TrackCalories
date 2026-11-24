"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flame, Pencil, Trash2, Utensils } from "lucide-react";
import { deleteMeal } from "@/features/quick-log/actions";
import { mealTypeLabels } from "@/lib/ai/draft";
import { formatNumber } from "@/lib/format";
import { mealTitle } from "./meal-card";
import type { DayMeal } from "./types";

/** Trang chi tiết một lần ghi: ảnh, tổng kcal, P/C/F và từng thành phần. */
export function MealDetail({ meal }: { meal: DayMeal & { date: string } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const back = `/?date=${meal.date}`;

  function remove() {
    if (!window.confirm(`Xóa “${mealTitle(meal)}”? Thao tác này không hoàn tác được.`)) return;
    startTransition(async () => {
      try {
        const result = await deleteMeal(meal.id);
        if (!result.ok) { setError("Chưa xóa được. Thử lại."); return; }
        router.push(back);
      } catch { setError("Mất kết nối, chưa xóa được. Thử lại."); }
    });
  }

  return <article className="meal-detail">
    <div className={`meal-hero${meal.photoUrl ? "" : " empty"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL của Supabase */}
      {meal.photoUrl ? <img src={meal.photoUrl} alt={`Ảnh ${mealTitle(meal)}`} /> : <Utensils size={40} aria-hidden="true" />}
      <Link href={back} className="hero-button" aria-label="Quay lại"><ArrowLeft size={20} /></Link>
    </div>
    <div className="meal-sheet">
      <p className="muted small">{mealTypeLabels[meal.mealType]} · {meal.time} · {meal.date.split("-").reverse().join("/")}</p>
      <h1>{mealTitle(meal)}</h1>
      <div className="detail-kcal"><Flame size={22} aria-hidden="true" /><div><span className="muted small">Calo</span><strong>{formatNumber(meal.totals.kcal)}</strong></div></div>
      <dl className="detail-macros">
        {([["protein", "Đạm"], ["carbs", "Tinh bột"], ["fat", "Chất béo"]] as const).map(([key, label]) =>
          <div key={key} className={key}><dt><i aria-hidden="true" />{label}</dt><dd>{formatNumber(meal.totals[key])}g</dd></div>)}
      </dl>
      <div className="detail-items-head"><h2>Thành phần <span className="count">{meal.items.length}</span></h2><Link href={`/meals/${meal.id}/edit`} className="text-link"><Pencil size={15} /> Sửa</Link></div>
      <ul className="detail-items">
        {meal.items.map(item => <li key={item.id}>
          <span><b>{item.name}</b>{item.aiEstimate && <span className="ai-dot" title="Ước tính AI">AI</span>}<small className="muted">{item.amount} · P {formatNumber(item.protein)} · C {formatNumber(item.carbs)} · F {formatNumber(item.fat)}</small></span>
          <span className="item-kcal">{formatNumber(item.kcal)} kcal</span>
        </li>)}
      </ul>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="detail-actions">
        <button type="button" className="button secondary" onClick={remove} disabled={pending}><Trash2 size={18} /> Xóa</button>
        <Link href={back} className="button dark-button">Xong</Link>
      </div>
    </div>
  </article>;
}
