import type { Nutrients } from "@/lib/demo/data";
import { calculateTargets, emptyProfile, type ProfileDraft } from "@/lib/nutrition/targets";
import type { Tables } from "@/lib/supabase/database.types";

// Ánh xạ giữa form thiết lập (chuỗi người dùng nhập) và bản ghi database.
const goalToDb = { loss: "lose", maintain: "maintain", gain: "gain", recomposition: "recomposition" } as const;
export const goalFromDb: Record<string, ProfileDraft["goal"]> = { lose: "loss", maintain: "maintain", gain: "gain", recomposition: "recomposition" };

// Cắt theo ký tự Unicode, không tách đôi cặp surrogate (emoji) khi vượt 300 ký tự.
const clip = (value: string) => Array.from(value).slice(0, 300).join("");
const text = (value: number | null | undefined) => value === null || value === undefined ? "" : String(value).replace(".", ",");

export function draftFromRows(profile: Tables<"profiles"> | null, goal: Tables<"goals"> | null, weightKg: number | null): ProfileDraft | null {
  if (!profile || !goal || profile.height_cm === null || profile.age_years === null || !profile.sex_for_formula || !profile.activity_level) return null;
  return {
    ...emptyProfile,
    weight: text(weightKg),
    height: text(profile.height_cm),
    age: text(profile.age_years),
    sex: profile.sex_for_formula,
    bodyFat: text(profile.body_fat_pct),
    activity: profile.activity_level,
    goal: goalFromDb[goal.goal_type] ?? "",
    weekly: goal.goal_type === "maintain" ? "" : String(Math.abs(goal.weekly_adjustment_kcal)),
    frequent: profile.frequent_foods,
    favorites: profile.favorite_foods,
    allergies: profile.allergies,
  };
}

export function targetsFromGoal(goal: Tables<"goals"> | null): Nutrients | null {
  return goal ? { kcal: Number(goal.daily_kcal), protein: Number(goal.protein_g), carbs: Number(goal.carbs_g), fat: Number(goal.fat_g) } : null;
}

/** Tính lại mục tiêu phía server từ hồ sơ đã validate; không dùng số do client gửi. */
export function rpcPayload(draft: ProfileDraft) {
  const result = calculateTargets(draft);
  if (!result.plan) return { error: result.error ?? "Thông tin chưa hợp lệ." } as const;
  const { plan } = result;
  const parse = (value: string) => Number(value.trim().replace(",", "."));
  return {
    profile: {
      height_cm: parse(draft.height), age_years: parse(draft.age), sex_for_formula: draft.sex,
      body_fat_pct: draft.bodyFat.trim() ? parse(draft.bodyFat) : "", activity_level: draft.activity,
      weight_kg: parse(draft.weight),
      frequent_foods: clip(draft.frequent), favorite_foods: clip(draft.favorites), allergies: clip(draft.allergies),
    },
    goal: {
      goal_type: goalToDb[draft.goal as keyof typeof goalToDb], weekly_adjustment_kcal: plan.signedWeekly,
      daily_kcal: plan.kcal, protein_g: plan.protein, carbs_g: plan.carbs, fat_g: plan.fat,
    },
  } as const;
}
