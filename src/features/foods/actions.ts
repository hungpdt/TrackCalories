"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { basisQuantityFor, basisUnit, portionFactor } from "@/lib/nutrition/portion";
import { requireUser } from "@/lib/supabase/server";
import { foodInputSchema, logFoodSchema, type FoodInput } from "./types";
import { toLibraryFood } from "./queries";

export type FoodResult = { ok: true; id: string } | { ok: false; error: string };

function toRow(input: FoodInput) {
  const perServing = input.basisType === "per_serving" || input.basisType === "per_package";
  return {
    name: input.name,
    basis_type: input.basisType,
    basis_quantity: basisQuantityFor[input.basisType],
    basis_unit: basisUnit[input.basisType],
    // Nhãn/khối lượng khẩu phần chỉ có nghĩa với cơ sở khẩu phần/gói.
    serving_label: perServing ? input.servingLabel || null : null,
    serving_mass_g: perServing ? input.servingMassG : null,
    serving_volume_ml: perServing ? input.servingVolumeMl : null,
    kcal: input.kcal, protein_g: input.protein, carbs_g: input.carbs, fat_g: input.fat,
  };
}

const invalid = { ok: false as const, error: "Kiểm tra lại tên món và bốn giá trị dinh dưỡng (số không âm)." };

export async function createFood(input: unknown): Promise<FoodResult> {
  const parsed = foodInputSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("foods").insert({ ...toRow(parsed.data), source: "manual" }).select("id").single();
  if (error || !data) return { ok: false, error: "Chưa lưu được món. Thử lại." };
  revalidatePath("/foods");
  return { ok: true, id: data.id };
}

export async function updateFood(id: unknown, input: unknown): Promise<FoodResult> {
  const foodId = z.uuid().safeParse(id);
  const parsed = foodInputSchema.safeParse(input);
  if (!foodId.success || !parsed.success) return invalid;
  const { supabase } = await requireUser();
  // Chỉ sửa bản ghi kho; các bữa đã ghi giữ snapshot riêng nên không đổi.
  const { data, error } = await supabase.from("foods").update(toRow(parsed.data)).eq("id", foodId.data).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "Chưa lưu được thay đổi. Thử lại." };
  revalidatePath("/foods");
  return { ok: true, id: data.id };
}

export async function deleteFood(id: unknown): Promise<{ ok: boolean }> {
  const foodId = z.uuid().safeParse(id);
  if (!foodId.success) return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("foods").delete().eq("id", foodId.data);
  revalidatePath("/foods");
  return { ok: !error };
}

export async function setFavorite(id: unknown, favorite: unknown): Promise<{ ok: boolean }> {
  const foodId = z.uuid().safeParse(id);
  if (!foodId.success || typeof favorite !== "boolean") return { ok: false };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("foods").update({ is_favorite: favorite }).eq("id", foodId.data);
  revalidatePath("/foods");
  return { ok: !error };
}

export type LogFoodResult = { ok: true; mealDate: string } | { ok: false; error: string };

/** Thêm món từ kho vào nhật ký: đọc món từ database (không tin số client), lưu qua save_meal với food_id. */
export async function logFood(input: unknown): Promise<LogFoodResult> {
  const parsed = logFoodSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Lượng ăn chưa hợp lệ." };
  const { requestId, foodId, quantity, unit, mealDate, mealType } = parsed.data;
  const { supabase } = await requireUser();
  const { data: row } = await supabase.from("foods").select("*").eq("id", foodId).maybeSingle();
  if (!row) return { ok: false, error: "Không tìm thấy món trong kho." };
  const food = toLibraryFood(row);
  if (portionFactor(food, quantity, unit) === null) return { ok: false, error: "Đơn vị này không quy đổi được cho món đã chọn." };

  const { error } = await supabase.rpc("save_meal", {
    p_request_id: requestId,
    p_meal: { meal_date: mealDate, meal_type: mealType },
    p_items: [{
      food_id: food.id, name: food.name,
      basis_type: food.basisType, basis_quantity: food.basisQuantity, basis_unit: basisUnit[food.basisType],
      serving_label: food.servingLabel, serving_mass_g: food.servingMassG, serving_volume_ml: food.servingVolumeMl,
      consumed_quantity: quantity, consumed_unit: unit,
      kcal: food.kcal, protein_g: food.protein, carbs_g: food.carbs, fat_g: food.fat,
      source: "library", assumptions: [],
    }],
  });
  if (error) return { ok: false, error: "Chưa lưu được vào nhật ký. Thử lại." };
  revalidatePath("/", "layout");
  return { ok: true, mealDate };
}
