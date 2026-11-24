"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DraftEditor, emptyItem } from "@/features/quick-log/draft-editor";
import type { DayMeal } from "./types";

const text = (value: number) => String(Math.round(value * 10) / 10).replace(".", ",");

/** Sửa thành phần bữa đã ghi bằng editor chung; lưu qua save_meal với revision (không ghi đè bản sửa khác). */
export function EditMeal({ meal }: { meal: DayMeal & { date: string; revision: number } }) {
  const router = useRouter();
  const items = meal.items.map(item => emptyItem({
    name: item.name, grams: item.grams === null ? "" : text(item.grams), portionNote: item.portionNote ?? "",
    kcal: text(item.kcal), protein: text(item.protein), carbs: text(item.carbs), fat: text(item.fat),
    source: item.aiEstimate ? "ai_estimate" : "manual",
    basis: { grams: item.grams, kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat },
  }));
  return <>
    <div className="edit-meal-head"><Link href={`/meals/${meal.id}`} className="hero-button static" aria-label="Quay lại"><ArrowLeft size={20} /></Link><h1>Sửa bữa ăn</h1></div>
    <DraftEditor initialItems={items} today={meal.date} defaultMealType={meal.mealType}
      editing={{ mealId: meal.id, revision: meal.revision, date: meal.date, mealType: meal.mealType }}
      onCancel={() => router.push(`/meals/${meal.id}`)} />
  </>;
}
