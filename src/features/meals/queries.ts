import "server-only";
import { mealTypes } from "@/lib/ai/draft";
import { todayIn } from "@/lib/dates/today";
import { requireUser } from "@/lib/supabase/server";
import type { DayMeal } from "./types";

const isDate = (value: string | undefined): value is string =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "2000-01-01" && value <= "2100-12-31" && !Number.isNaN(Date.parse(value)));

/** Ngày đang xem: tham số ?date hợp lệ, nếu không thì hôm nay theo múi giờ hồ sơ. */
export async function resolveDay(requested: string | undefined) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("profiles").select("timezone").maybeSingle();
  const today = todayIn(data?.timezone ?? "Asia/Ho_Chi_Minh");
  return { today, date: isDate(requested) ? requested : today };
}

/** Bữa ăn của một ngày, tổng tính từ total_* của từng item snapshot (không cache tổng). */
export async function getMealsOn(date: string): Promise<DayMeal[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("meals")
    .select("id, meal_type, eaten_at, revision, meal_items(id, position, name_snapshot, consumed_quantity, consumed_unit, serving_label_snapshot, total_kcal, total_protein_g, total_carbs_g, total_fat_g, source_snapshot, manual_override)")
    .eq("meal_date", date)
    .order("eaten_at", { ascending: true });
  if (error) throw new Error("Không đọc được nhật ký.");
  return (data ?? [])
    .map(meal => {
      const items = [...meal.meal_items].sort((x, y) => x.position - y.position).map(item => ({
        id: item.id,
        name: item.name_snapshot,
        amount: item.consumed_unit === "g" ? `${Number(item.consumed_quantity)} g` : item.serving_label_snapshot ?? `${Number(item.consumed_quantity)} phần`,
        kcal: Number(item.total_kcal), protein: Number(item.total_protein_g), carbs: Number(item.total_carbs_g), fat: Number(item.total_fat_g),
        aiEstimate: item.source_snapshot === "ai_estimate",
      }));
      const totals = items.reduce((sum, item) => ({
        kcal: sum.kcal + item.kcal, protein: sum.protein + item.protein, carbs: sum.carbs + item.carbs, fat: sum.fat + item.fat,
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
      return { id: meal.id, mealType: meal.meal_type as DayMeal["mealType"], items, totals };
    })
    .sort((x, y) => mealTypes.indexOf(x.mealType) - mealTypes.indexOf(y.mealType));
}

export async function getLatestWeight(onOrBefore: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("weight_logs").select("weight_kg, logged_date").lte("logged_date", onOrBefore)
    .order("logged_date", { ascending: false }).limit(1).maybeSingle();
  return data ? { kg: Number(data.weight_kg), date: data.logged_date } : null;
}
