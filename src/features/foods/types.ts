import { z } from "zod";
import type { BasisType, FoodBasis } from "@/lib/nutrition/portion";

export type LibraryFood = FoodBasis & {
  id: string;
  name: string;
  servingLabel: string | null;
  source: "manual" | "ai_estimate" | "label_scan";
  isFavorite: boolean;
  lastUsedAt: string | null;
};

export const basisLabels: Record<BasisType, string> = {
  per_100g: "100 g", per_100ml: "100 ml", per_serving: "1 khẩu phần", per_package: "1 gói",
};

/** Nhãn cơ sở hiển thị: "1 tô", "100 g", "1 gói (200 g)"… */
export function basisText(food: Pick<LibraryFood, "basisType" | "servingLabel" | "servingMassG" | "servingVolumeMl">) {
  if (food.basisType === "per_100g" || food.basisType === "per_100ml") return basisLabels[food.basisType];
  const label = food.servingLabel || basisLabels[food.basisType];
  const amount = food.servingMassG ? ` (~${food.servingMassG} g)` : food.servingVolumeMl ? ` (~${food.servingVolumeMl} ml)` : "";
  return `${label}${amount}`;
}

const optionalPositive = (max: number) => z.number().positive().max(max).nullable();

/** Dữ liệu form tạo/sửa món (đã đổi chuỗi người dùng nhập sang số ở client, server kiểm tra lại). */
export const foodInputSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên món.").max(120),
  basisType: z.enum(["per_100g", "per_100ml", "per_serving", "per_package"]),
  servingLabel: z.string().trim().max(60).nullable(),
  servingMassG: optionalPositive(100000),
  servingVolumeMl: optionalPositive(100000),
  kcal: z.number().min(0).max(100000),
  protein: z.number().min(0).max(100000),
  carbs: z.number().min(0).max(100000),
  fat: z.number().min(0).max(100000),
});

export type FoodInput = z.infer<typeof foodInputSchema>;

export const logFoodSchema = z.object({
  requestId: z.uuid(),
  foodId: z.uuid(),
  quantity: z.number().positive().max(100000),
  unit: z.enum(["g", "ml", "serving", "package"]),
  mealDate: z.iso.date(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
});
