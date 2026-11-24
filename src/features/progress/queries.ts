import "server-only";
import { requireUser } from "@/lib/supabase/server";
import type { Nutrients } from "@/lib/format";

export type DayTotal = Nutrients & { date: string };

function shift(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Tổng dinh dưỡng từng ngày có ghi bữa, 180 ngày gần nhất (đủ cho so sánh 90 ngày với 90 ngày trước đó). */
export async function getDailyTotals(today: string): Promise<DayTotal[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("meals").select("meal_date, meal_items(total_kcal, total_protein_g, total_carbs_g, total_fat_g)")
    .gte("meal_date", shift(today, -180)).lte("meal_date", today);
  if (error) throw new Error("Không đọc được nhật ký ăn.");
  const byDay = new Map<string, DayTotal>();
  for (const meal of data ?? []) {
    const day = byDay.get(meal.meal_date) ?? { date: meal.meal_date, kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const item of meal.meal_items) {
      day.kcal += Number(item.total_kcal); day.protein += Number(item.total_protein_g);
      day.carbs += Number(item.total_carbs_g); day.fat += Number(item.total_fat_g);
    }
    byDay.set(meal.meal_date, day);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Chiều cao (cho BMI) và cân nặng mục tiêu của mục tiêu đang hiệu lực. */
export async function getBodyGoal(today: string): Promise<{ heightCm: number | null; targetKg: number | null }> {
  const { supabase } = await requireUser();
  const [{ data: profile }, { data: goal }] = await Promise.all([
    supabase.from("profiles").select("height_cm").maybeSingle(),
    supabase.from("goals").select("target_weight_kg").lte("effective_from", today).not("target_weight_kg", "is", null)
      .order("effective_from", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    heightCm: profile?.height_cm ? Number(profile.height_cm) : null,
    targetKg: goal?.target_weight_kg ? Number(goal.target_weight_kg) : null,
  };
}
