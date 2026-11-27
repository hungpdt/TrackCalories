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
  // Gom theo ngày trong SQL (một dòng/ngày), không đọc từng món nên không vượt giới hạn số dòng của API.
  const { data, error } = await supabase.rpc("daily_totals", { p_from: shift(today, -180), p_to: today });
  if (error) throw new Error("Không đọc được nhật ký ăn.");
  return (data ?? []).map(row => ({
    date: row.meal_date, kcal: Number(row.kcal), protein: Number(row.protein_g), carbs: Number(row.carbs_g), fat: Number(row.fat_g),
  }));
}

/** Chiều cao (cho BMI) và cân nặng mục tiêu của mục tiêu đang hiệu lực. */
export async function getBodyGoal(today: string): Promise<{ heightCm: number | null; targetKg: number | null; goalKcal: number | null; weeklyKcal: number }> {
  const { supabase } = await requireUser();
  const [{ data: profile }, { data: goal }] = await Promise.all([
    supabase.from("profiles").select("height_cm").maybeSingle(),
    // Chỉ lấy mục tiêu đang hiệu lực: người dùng xóa cân mục tiêu (null) thì không quay về số của mục tiêu cũ.
    supabase.from("goals").select("target_weight_kg, daily_kcal, weekly_adjustment_kcal").lte("effective_from", today)
      .order("effective_from", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    heightCm: profile?.height_cm ? Number(profile.height_cm) : null,
    targetKg: goal?.target_weight_kg ? Number(goal.target_weight_kg) : null,
    goalKcal: goal ? Number(goal.daily_kcal) : null,
    weeklyKcal: goal?.weekly_adjustment_kcal ?? 0,
  };
}
