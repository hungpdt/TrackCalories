"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Utensils } from "lucide-react";
import { deleteMeal } from "@/features/quick-log/actions";
import { mealTypeLabels } from "@/lib/ai/draft";
import { formatNumber } from "@/lib/demo/data";
import type { DayMeal } from "./types";

/** Danh sách bữa của một ngày từ database; cho phép xóa cả bữa khi có onDelete. */
export function DayMeals({ meals, allowDelete = false }: { meals: DayMeal[]; allowDelete?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function remove(meal: DayMeal) {
    if (!window.confirm(`Xóa ${mealTypeLabels[meal.mealType].toLowerCase()} (${meal.items.length} món)? Thao tác này không hoàn tác được.`)) return;
    startTransition(async () => {
      const result = await deleteMeal(meal.id);
      setMessage(result.ok ? "Đã xóa bữa ăn." : "Chưa xóa được bữa ăn. Thử lại.");
      router.refresh();
    });
  }

  return <div className="day-meals">
    {meals.map(meal => <article key={meal.id} className="day-meal">
      <header className="day-meal-head">
        <span className="food-symbol"><Utensils size={20} /></span>
        <div>
          <h3>{mealTypeLabels[meal.mealType]}</h3>
          <p className="small muted">{meal.items.length} món · P {formatNumber(meal.totals.protein)} · C {formatNumber(meal.totals.carbs)} · F {formatNumber(meal.totals.fat)} g</p>
        </div>
        <strong className="day-meal-kcal">{formatNumber(meal.totals.kcal)} <small>kcal</small></strong>
        {allowDelete && <button className="icon-button" disabled={pending} aria-label={`Xóa ${mealTypeLabels[meal.mealType]}`} onClick={() => remove(meal)}><Trash2 size={18} /></button>}
      </header>
      <ul className="day-meal-items">
        {meal.items.map(item => <li key={item.id}>
          <span><b>{item.name}</b> <span className="muted">· {item.amount}</span>{item.aiEstimate && <span className="tag estimate-tag">Ước tính AI</span>}</span>
          <span className="muted">{formatNumber(item.kcal)} kcal</span>
        </li>)}
      </ul>
    </article>)}
    {message && <p role="status" className="feedback">{message}</p>}
  </div>;
}
