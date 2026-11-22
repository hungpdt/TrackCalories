"use client";
import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { initialFoods, initialMeals, initialWeights, type Food, type Meal } from "@/lib/demo/data";
// Mục tiêu không nằm ở đây: Dashboard và Cài đặt cùng đọc hồ sơ đã lưu (features/goals/profile-store).
type DemoState = {
  foods: Food[]; setFoods: Dispatch<SetStateAction<Food[]>>;
  meals: Meal[]; setMeals: Dispatch<SetStateAction<Meal[]>>;
  weights: typeof initialWeights; setWeights: Dispatch<SetStateAction<typeof initialWeights>>;
};
const DemoContext = createContext<DemoState | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [foods, setFoods] = useState(initialFoods);
  const [meals, setMeals] = useState(initialMeals);
  const [weights, setWeights] = useState(initialWeights);
  return <DemoContext.Provider value={{ foods, setFoods, meals, setMeals, weights, setWeights }}>{children}</DemoContext.Provider>;
}
export function useDemo() { const state = useContext(DemoContext); if (!state) throw new Error("DemoProvider required"); return state; }
