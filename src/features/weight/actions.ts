"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const weightSchema = z.object({
  date: z.iso.date().refine(value => value >= "2000-01-01" && value <= "2100-12-31"),
  kg: z.number().min(20).max(350),
  replace: z.boolean(),
});

export type SaveWeightResult =
  | { ok: true; replaced: boolean }
  | { ok: false; conflict: { kg: number } }
  | { ok: false; error: string };

/** Mỗi ngày một số đo. Ngày đã có: trả conflict để người dùng xác nhận, chỉ ghi đè khi replace=true. */
export async function saveWeight(input: unknown): Promise<SaveWeightResult> {
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nhập cân nặng từ 20 đến 350 kg và ngày hợp lệ." };
  const { date, kg, replace } = parsed.data;
  const { supabase } = await requireUser();
  const { data: existing } = await supabase.from("weight_logs").select("id, weight_kg").eq("logged_date", date).maybeSingle();
  if (existing && !replace) return { ok: false, conflict: { kg: Number(existing.weight_kg) } };
  const { error } = existing
    ? await supabase.from("weight_logs").update({ weight_kg: kg }).eq("id", existing.id)
    : await supabase.from("weight_logs").insert({ logged_date: date, weight_kg: kg });
  if (error) {
    // Hai lần lưu cùng ngày gần như đồng thời: bản ghi đã có, coi như cần xác nhận.
    if (error.code === "23505") return { ok: false, conflict: { kg } };
    return { ok: false, error: "Chưa lưu được cân nặng. Thử lại." };
  }
  revalidatePath("/", "layout");
  return { ok: true, replaced: Boolean(existing) };
}

export async function deleteWeight(id: unknown): Promise<{ ok: boolean }> {
  const weightId = z.uuid().safeParse(id);
  if (!weightId.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("weight_logs").delete().eq("id", weightId.data);
  revalidatePath("/", "layout");
  return { ok: !error };
}
