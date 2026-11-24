import type { mealTypes } from "@/lib/ai/draft";
import type { Nutrients } from "@/lib/format";

export type DayMealItem = Nutrients & {
  id: string; name: string; amount: string; aiEstimate: boolean;
  /** Gram đã ăn (khi đơn vị là g) và nhãn khẩu phần, để mở lại trong editor. */
  grams: number | null; portionNote: string | null;
};
export type DayMeal = {
  id: string; mealType: (typeof mealTypes)[number]; items: DayMealItem[]; totals: Nutrients;
  /** Giờ ăn "HH:mm" theo múi giờ hồ sơ. */
  time: string;
  /** Đường dẫn ảnh bữa qua /api/meals/[id]/photo, hoặc null. */
  photoUrl: string | null;
};

export function sumDay(meals: DayMeal[]): Nutrients {
  return meals.reduce((sum, meal) => ({
    kcal: sum.kcal + meal.totals.kcal, protein: sum.protein + meal.totals.protein,
    carbs: sum.carbs + meal.totals.carbs, fat: sum.fat + meal.totals.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}
