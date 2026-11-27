"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isProfileDraft } from "@/lib/nutrition/targets";
import { requireUser } from "@/lib/supabase/server";
import { rpcPayload } from "./profile-mapping";

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveProfileGoal(input: unknown): Promise<SaveResult> {
  if (!isProfileDraft(input)) return { ok: false, error: "Dữ liệu hồ sơ không hợp lệ." };
  const payload = rpcPayload(input);
  if ("error" in payload) return { ok: false, error: payload.error ?? "Thông tin chưa hợp lệ." };
  const { supabase } = await requireUser();
  const latestGoal = () => supabase.from("goals").select("id, target_weight_kg").order("effective_from", { ascending: false }).limit(1).maybeSingle();
  const { data: previous } = await latestGoal();
  const { error } = await supabase.rpc("save_profile_goal", { p_profile: payload.profile, p_goal: payload.goal });
  if (error) return { ok: false, error: "Chưa lưu được mục tiêu. Kiểm tra kết nối rồi thử lại." };
  // Tính lại mục tiêu tạo phiên bản mới: giữ cân nặng mục tiêu đã đặt ở Tiến độ (form mục tiêu không có ô này).
  if (previous?.target_weight_kg) {
    const { data: current } = await latestGoal();
    if (current && current.target_weight_kg === null) await supabase.from("goals").update({ target_weight_kg: previous.target_weight_kg }).eq("id", current.id);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Áp dụng TDEE thực tế (thẻ ở Tiến độ): tạo phiên bản mục tiêu từ hôm nay với kcal = TDEE ± mức điều chỉnh tuần/7,
 * giữ loại mục tiêu, mức điều chỉnh, cân mục tiêu. Protein giữ số gram cũ (tối đa 35% kcal), chất béo 25%, carb phần còn lại.
 */
export async function applyAdaptiveTarget(input: unknown): Promise<SaveResult> {
  const parsed = z.object({ tdee: z.number().int().min(1000).max(6000), today: z.iso.date() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "TDEE không hợp lệ." };
  const { tdee, today } = parsed.data;
  const { supabase } = await requireUser();
  const { data: goal } = await supabase.from("goals").select("goal_type, weekly_adjustment_kcal, target_weight_kg, baseline_weight_kg, protein_g")
    .lte("effective_from", today).order("effective_from", { ascending: false }).limit(1).maybeSingle();
  if (!goal) return { ok: false, error: "Chưa có mục tiêu để cập nhật." };
  const kcal = Math.round(tdee + goal.weekly_adjustment_kcal / 7);
  if (kcal < 1200) return { ok: false, error: "Mức nạp mới dưới 1.200 kcal. Giảm mức thâm hụt ở phần mục tiêu trước." };
  const protein = Math.round(Math.min(Number(goal.protein_g), kcal * 0.35 / 4));
  const fat = Math.round(kcal * 0.25 / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  const { error } = await supabase.from("goals").upsert({
    goal_type: goal.goal_type, weekly_adjustment_kcal: goal.weekly_adjustment_kcal, target_weight_kg: goal.target_weight_kg,
    baseline_weight_kg: goal.baseline_weight_kg, daily_kcal: kcal, protein_g: protein, carbs_g: carbs, fat_g: fat, effective_from: today,
  }, { onConflict: "user_id,effective_from" });
  if (error) return { ok: false, error: "Chưa lưu được mục tiêu. Thử lại." };
  revalidatePath("/", "layout");
  return { ok: true };
}
