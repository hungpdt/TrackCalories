import "server-only";
import { requireUser } from "@/lib/supabase/server";

export type WeightEntry = { id: string; date: string; kg: number; note: string | null };

/** Nhật ký cân nặng (mới nhất trước), tối đa ~2 năm cho biểu đồ và lịch sử. */
export async function listWeights(): Promise<WeightEntry[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("weight_logs").select("id, logged_date, weight_kg, note")
    .order("logged_date", { ascending: false }).limit(730);
  if (error) throw new Error("Không đọc được nhật ký cân nặng.");
  return (data ?? []).map(row => ({ id: row.id, date: row.logged_date, kg: Number(row.weight_kg), note: row.note }));
}

/**
 * Cân nặng lúc đặt mục tiêu hiện hành (lưu trong goals.baseline_weight_kg, không đổi khi sửa nhật ký cân nặng).
 * Dùng để gợi ý tính lại mục tiêu khi cân nặng đã đổi nhiều (không tự đổi mục tiêu).
 */
export async function getGoalBaseline(today: string): Promise<{ goalKcal: number; baselineKg: number } | null> {
  const { supabase } = await requireUser();
  const { data: goal } = await supabase.from("goals").select("daily_kcal, baseline_weight_kg").lte("effective_from", today)
    .order("effective_from", { ascending: false }).limit(1).maybeSingle();
  if (!goal || goal.baseline_weight_kg === null) return null;
  return { goalKcal: Number(goal.daily_kcal), baselineKg: Number(goal.baseline_weight_kg) };
}
