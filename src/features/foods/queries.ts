import "server-only";
import type { Tables } from "@/lib/supabase/database.types";
import { requireUser } from "@/lib/supabase/server";
import type { LibraryFood } from "./types";

export function toLibraryFood(row: Tables<"foods">): LibraryFood {
  return {
    id: row.id,
    name: row.name,
    basisType: row.basis_type as LibraryFood["basisType"],
    basisQuantity: Number(row.basis_quantity),
    servingLabel: row.serving_label,
    servingMassG: row.serving_mass_g === null ? null : Number(row.serving_mass_g),
    servingVolumeMl: row.serving_volume_ml === null ? null : Number(row.serving_volume_ml),
    kcal: Number(row.kcal), protein: Number(row.protein_g), carbs: Number(row.carbs_g), fat: Number(row.fat_g),
    source: row.source as LibraryFood["source"],
    isFavorite: row.is_favorite,
    lastUsedAt: row.last_used_at,
  };
}

/** Toàn bộ kho món của người dùng (kho cá nhân nhỏ; tìm không dấu làm ở client). */
export async function listFoods(): Promise<LibraryFood[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("foods").select("*")
    .order("last_used_at", { ascending: false, nullsFirst: false }).order("name").limit(1000);
  if (error) throw new Error("Không đọc được kho món.");
  return (data ?? []).map(toLibraryFood);
}

export async function getFood(id: string): Promise<LibraryFood | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("foods").select("*").eq("id", id).maybeSingle();
  return data ? toLibraryFood(data) : null;
}
