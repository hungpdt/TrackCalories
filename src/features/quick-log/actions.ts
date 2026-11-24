"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveMealSchema } from "@/lib/ai/draft";
import { requireUser } from "@/lib/supabase/server";
import { normalizeVi } from "@/lib/text/search";

export type SaveMealResult = { ok: true; mealDate: string; libraryWarning?: string } | { ok: false; error: string };

/**
 * Lưu bữa từ editor chung (bản nháp AI hoặc nhập thủ công) qua RPC save_meal.
 * Có gram: cơ sở 100 g suy từ tổng người dùng xác nhận; không có gram: 1 khẩu phần.
 * save_meal tính lại tổng = cơ sở × hệ số, nên tổng lưu khớp số người dùng thấy (làm tròn 4 chữ số).
 */
export async function saveMeal(input: unknown): Promise<SaveMealResult> {
  const parsed = saveMealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Kiểm tra lại: mỗi món cần tên và đủ kcal, protein, carb, chất béo không âm." };
  const { requestId, mealDate, mealType, items } = parsed.data;
  const { supabase } = await requireUser();

  const per100 = (value: number, grams: number) => Math.round((value * 100 / grams) * 10000) / 10000;
  const payload = items.map(item => item.grams ? {
    name: item.name, basis_type: "per_100g", basis_quantity: 100, basis_unit: "g",
    consumed_quantity: item.grams, consumed_unit: "g", serving_label: item.portionNote,
    kcal: per100(item.kcal, item.grams), protein_g: per100(item.protein_g, item.grams),
    carbs_g: per100(item.carbs_g, item.grams), fat_g: per100(item.fat_g, item.grams),
    source: item.source, assumptions: item.assumptions,
  } : {
    name: item.name, basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving",
    consumed_quantity: 1, consumed_unit: "serving", serving_label: item.portionNote || "1 phần",
    kcal: item.kcal, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g,
    source: item.source, assumptions: item.assumptions,
  });

  const { error } = await supabase.rpc("save_meal", {
    p_request_id: requestId, p_meal: { meal_date: mealDate, meal_type: mealType }, p_items: payload,
  });
  if (error) {
    if (error.message.includes("idempotency_conflict")) return { ok: false, error: "Bản nháp đã thay đổi sau lần lưu trước. Bấm lưu lại." };
    return { ok: false, error: "Chưa lưu được bữa ăn. Bản nháp vẫn được giữ, hãy thử lại." };
  }

  // Món được tích "Lưu vào kho": chỉ thêm sau khi bữa đã lưu, bỏ qua tên đã có trong kho (lưu lại không tạo trùng).
  const toLibrary = items.filter(item => item.saveToLibrary);
  let libraryWarning: string | undefined;
  if (toLibrary.length) {
    const { data: existing } = await supabase.from("foods").select("name");
    const known = new Set((existing ?? []).map(row => normalizeVi(row.name)));
    const rows = toLibrary.filter(item => !known.has(normalizeVi(item.name))).map(item => item.grams ? {
      name: item.name, basis_type: "per_100g", basis_quantity: 100, basis_unit: "g",
      kcal: per100(item.kcal, item.grams), protein_g: per100(item.protein_g, item.grams),
      carbs_g: per100(item.carbs_g, item.grams), fat_g: per100(item.fat_g, item.grams),
      source: item.source, source_note: item.source === "ai_estimate" ? "Từ bản nháp AI" : null,
    } : {
      name: item.name, basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", serving_label: item.portionNote || "1 phần",
      kcal: item.kcal, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g,
      source: item.source, source_note: item.source === "ai_estimate" ? "Từ bản nháp AI" : null,
    });
    if (rows.length) {
      const { error: libraryError } = await supabase.from("foods").insert(rows);
      if (libraryError) libraryWarning = "Bữa đã lưu nhưng chưa thêm được món vào kho.";
    }
  }
  revalidatePath("/", "layout");
  return { ok: true, mealDate, libraryWarning };
}

export async function deleteMeal(mealId: unknown): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(mealId);
  if (!id.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("meals").delete().eq("id", id.data);
  revalidatePath("/", "layout");
  return { ok: !error };
}
