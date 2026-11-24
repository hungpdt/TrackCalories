import type { Nutrients } from "@/lib/format";

// Tính khẩu phần (PRD mục 5). Logic hệ số phải khớp RPC save_meal trong supabase/migrations:
// cùng đơn vị → lượng ăn / lượng cơ sở; khẩu phần ↔ gram/ml chỉ khi biết khối lượng/thể tích khẩu phần.
// Không bao giờ tự đổi ml ↔ g.
export type BasisType = "per_100g" | "per_100ml" | "per_serving" | "per_package";
export type PortionUnit = "g" | "ml" | "serving" | "package";

export type FoodBasis = Nutrients & {
  basisType: BasisType;
  basisQuantity: number;
  servingMassG: number | null;
  servingVolumeMl: number | null;
};

export const basisUnit: Record<BasisType, PortionUnit> = {
  per_100g: "g", per_100ml: "ml", per_serving: "serving", per_package: "package",
};

export const basisQuantityFor: Record<BasisType, number> = {
  per_100g: 100, per_100ml: 100, per_serving: 1, per_package: 1,
};

/** Hệ số nhân dinh dưỡng cơ sở; null khi đơn vị không quy đổi được. */
export function portionFactor(food: FoodBasis, quantity: number, unit: PortionUnit): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const base = basisUnit[food.basisType];
  if (unit === base) return quantity / food.basisQuantity;
  if (unit === "serving" && base === "g" && food.servingMassG) return quantity * food.servingMassG / food.basisQuantity;
  if (unit === "serving" && base === "ml" && food.servingVolumeMl) return quantity * food.servingVolumeMl / food.basisQuantity;
  if (unit === "g" && (base === "serving" || base === "package") && food.servingMassG) return quantity / food.servingMassG / food.basisQuantity;
  if (unit === "ml" && (base === "serving" || base === "package") && food.servingVolumeMl) return quantity / food.servingVolumeMl / food.basisQuantity;
  return null;
}

/** Tổng dinh dưỡng cho lượng ăn; giữ độ chính xác, chỉ làm tròn khi hiển thị. */
export function portionTotals(food: FoodBasis, quantity: number, unit: PortionUnit): Nutrients | null {
  const factor = portionFactor(food, quantity, unit);
  if (factor === null) return null;
  return { kcal: food.kcal * factor, protein: food.protein * factor, carbs: food.carbs * factor, fat: food.fat * factor };
}

/** Các đơn vị người dùng có thể chọn cho món này (đơn vị cơ sở luôn có). */
export function availableUnits(food: FoodBasis): PortionUnit[] {
  const base = basisUnit[food.basisType];
  const units: PortionUnit[] = [base];
  if ((base === "serving" || base === "package") && food.servingMassG) units.push("g");
  if ((base === "serving" || base === "package") && food.servingVolumeMl) units.push("ml");
  if ((base === "g" && food.servingMassG) || (base === "ml" && food.servingVolumeMl)) units.push("serving");
  return units;
}
