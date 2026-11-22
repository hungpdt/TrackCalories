import type { mealTypes } from "@/lib/ai/draft";
import type { Nutrients } from "@/lib/demo/data";

export type DayMealItem = Nutrients & { id: string; name: string; amount: string; aiEstimate: boolean };
export type DayMeal = { id: string; mealType: (typeof mealTypes)[number]; items: DayMealItem[]; totals: Nutrients };

export function sumDay(meals: DayMeal[]): Nutrients {
  return meals.reduce((sum, meal) => ({
    kcal: sum.kcal + meal.totals.kcal, protein: sum.protein + meal.totals.protein,
    carbs: sum.carbs + meal.totals.carbs, fat: sum.fat + meal.totals.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}
