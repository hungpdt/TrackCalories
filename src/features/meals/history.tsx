"use client";

import { useRouter } from "next/navigation";
import { AddMealLink, DatePicker, EmptyState, PageHeading } from "@/components/ui/shared";
import { formatNumber } from "@/lib/format";
import { DayMeals } from "./day-meals";
import { sumDay, type DayMeal } from "./types";

export function History({ date, meals, notice }: { date: string; meals: DayMeal[]; notice?: string }) {
  const router = useRouter();
  const total = sumDay(meals);
  return <>
    <PageHeading eyebrow="NHÌN LẠI TỪNG NGÀY" title="Nhật ký bữa ăn" description="Mỗi món ăn là một phần trong hành trình của bạn."
      action={<><DatePicker value={date} onChange={value => router.push(`/history?date=${value}`)} /><AddMealLink date={date} /></>} />
    {notice && <p className="saved-notice" role="status">{notice}</p>}
    <div className="summary-strip">
      <div><span>Tổng năng lượng</span><strong>{formatNumber(total.kcal)} <small>kcal</small></strong></div>
      <div><span>Protein</span><strong>{formatNumber(total.protein)} <small>g</small></strong></div>
      <div><span>Carbs</span><strong>{formatNumber(total.carbs)} <small>g</small></strong></div>
      <div><span>Chất béo</span><strong>{formatNumber(total.fat)} <small>g</small></strong></div>
    </div>
    <section className="card">
      <div className="section-heading"><h2>Các bữa đã ghi</h2></div>
      {meals.length ? <DayMeals meals={meals} allowDelete />
        : <EmptyState title="Nhật ký đang trống" detail="Ngày này chưa có bữa nào." action={<AddMealLink date={date} />} />}
    </section>
  </>;
}
