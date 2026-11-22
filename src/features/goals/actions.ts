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
  const { error } = await supabase.rpc("save_profile_goal", { p_profile: payload.profile, p_goal: payload.goal });
  if (error) return { ok: false, error: "Chưa lưu được mục tiêu. Kiểm tra kết nối rồi thử lại." };
  revalidatePath("/", "layout");
  return { ok: true };
}
