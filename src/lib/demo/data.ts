// Fictional fixtures for interface review; never seed into real user data.
export type Nutrients = { kcal: number; protein: number; carbs: number; fat: number };
export type Food = Nutrients & { id: string; name: string; serving: string; category: string; favorite: boolean };
export type Meal = Nutrients & { id: string; date: string; type: string; name: string; serving: string };
export const DEMO_DATE = "2026-11-22";
export const mealTypes = ["Bữa sáng", "Bữa trưa", "Bữa tối", "Bữa phụ"];
export const initialFoods: Food[] = [
  { id: "pho", name: "Phở bò", serving: "1 tô", category: "Món Việt", kcal: 450, protein: 28, carbs: 58, fat: 12, favorite: true },
  { id: "rice", name: "Cơm gà áp chảo", serving: "1 phần", category: "Món Việt", kcal: 620, protein: 48, carbs: 72, fat: 16, favorite: true },
  { id: "yogurt", name: "Sữa chua Hy Lạp", serving: "1 hộp · 100 g", category: "Bữa phụ", kcal: 97, protein: 9, carbs: 4, fat: 5, favorite: false },
  { id: "banana", name: "Chuối", serving: "1 quả", category: "Trái cây", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, favorite: true },
  { id: "egg", name: "Trứng luộc", serving: "2 quả", category: "Bữa phụ", kcal: 156, protein: 12.6, carbs: 1.2, fat: 10.6, favorite: false },
  { id: "milk", name: "Sữa tươi không đường", serving: "250 ml", category: "Đồ uống", kcal: 150, protein: 8, carbs: 12, fat: 8, favorite: false },
];
export const initialMeals: Meal[] = initialFoods.slice(0, 3).map((food, index) => ({ ...food, id: `meal-${index}`, date: DEMO_DATE, type: ["Bữa sáng", "Bữa trưa", "Bữa phụ"][index] }));
export const initialWeights = [
  { date: "2026-11-01", value: 75.8 }, { date: "2026-11-05", value: 75.5 },
  { date: "2026-11-09", value: 75.7 }, { date: "2026-11-13", value: 75.2 },
  { date: "2026-11-17", value: 75.1 }, { date: DEMO_DATE, value: 74.8 },
];
export function sumMeals(meals: Nutrients[]): Nutrients {
  return meals.reduce((total, item) => ({ kcal: total.kcal + item.kcal, protein: total.protein + item.protein, carbs: total.carbs + item.carbs, fat: total.fat + item.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}
export function formatNumber(value: number) { return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value); }
export function formatDate(value: string) { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
