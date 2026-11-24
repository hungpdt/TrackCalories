import { uuid } from "@/lib/uuid";
import { initialFoods } from "@/lib/demo/data";
import type { EditorItem } from "./draft-editor";

/**
 * "Thêm vào bữa" từ Kho món minh họa (Kho món thật có ở G3): điền sẵn editor thủ công.
 * Người dùng vẫn phải xác nhận; giả định ghi rõ đây là số liệu minh họa.
 */
export function emptyItemFromDemoFood(id: string | undefined): EditorItem | undefined {
  const food = initialFoods.find(item => item.id === id);
  if (!food) return undefined;
  const show = (value: number) => String(value).replace(".", ",");
  return {
    key: uuid(), name: food.name, grams: "", portionNote: food.serving,
    kcal: show(food.kcal), protein: show(food.protein), carbs: show(food.carbs), fat: show(food.fat),
    source: "manual", needsReview: true, assumptions: ["Số liệu từ kho món minh họa, hãy kiểm tra trước khi lưu"],
    basis: { grams: null, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat },
  };
}
