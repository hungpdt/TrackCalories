"use server";

import { revalidatePath } from "next/cache";
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
