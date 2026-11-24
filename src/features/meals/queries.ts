import "server-only";
import { mealTypes } from "@/lib/ai/draft";
import { todayIn } from "@/lib/dates/today";
import { requireUser } from "@/lib/supabase/server";
import type { DayMeal } from "./types";

// Kiểm tra vòng: "2026-02-30" vẫn parse được trong JS nhưng không khớp lại chuỗi gốc.
export function isCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Bữa mặc định theo giờ hiện tại ở múi giờ hồ sơ (không theo giờ máy chủ hay thiết bị). */
function mealTypeAt(timeZone: string): DayMeal["mealType"] {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "snack";
}

/** Ngày đang xem: tham số ?date hợp lệ, nếu không thì hôm nay theo múi giờ hồ sơ. */
export async function resolveDay(requested: string | undefined) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("profiles").select("timezone").maybeSingle();
  const timezone = data?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayIn(timezone);
  return { today, timezone, defaultMealType: mealTypeAt(timezone), date: isCalendarDate(requested) ? requested : today };
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
