"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDemo } from "@/components/demo-provider";
import { PageHeading, AddMealLink, DatePicker, MealList, EmptyState } from "@/components/ui/shared";
import { DEMO_DATE, sumMeals, formatNumber } from "@/lib/demo/data";
export function History() {
  const { meals, setMeals } = useDemo(); const params = useSearchParams(); const requestedDate = params.get("date"); const [date, setDate] = useState(requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : DEMO_DATE); const [message, setMessage] = useState("");
  const filtered = meals.filter(meal => meal.date === date); const total = sumMeals(filtered);
  return <><PageHeading eyebrow="NHÌN LẠI TỪNG NGÀY" title="Nhật ký bữa ăn" description="Mỗi món ăn là một phần trong hành trình của bạn." action={<><DatePicker value={date} onChange={setDate} /><AddMealLink /></>} /><div className="summary-strip"><div><span>Tổng năng lượng</span><strong>{formatNumber(total.kcal)} <small>kcal</small></strong></div><div><span>Protein</span><strong>{formatNumber(total.protein)} <small>g</small></strong></div><div><span>Carbs</span><strong>{formatNumber(total.carbs)} <small>g</small></strong></div><div><span>Chất béo</span><strong>{formatNumber(total.fat)} <small>g</small></strong></div></div><section className="card"><div className="section-heading"><h2>Các món đã ghi</h2><span className="tag">Thử xóa trong phiên mẫu</span></div>{filtered.length ? <MealList meals={filtered} onDelete={id => { setMeals(current => current.filter(meal => meal.id !== id)); setMessage("Đã xóa món khỏi phiên minh họa. Tải lại trang sẽ khôi phục dữ liệu mẫu."); }} /> : <EmptyState title="Nhật ký đang trống" detail="Ngày này chưa có món nào. Bạn có thể thử thêm một bữa ăn." action={<AddMealLink />} />}</section><p className="feedback" role="status">{message}</p></>;
}
