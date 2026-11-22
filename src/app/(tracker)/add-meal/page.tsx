import { Suspense } from "react";
import { MealEditor } from "@/features/meals/meal-editor";
export const metadata = { title: "Ghi bữa ăn" };
export default function Page() { return <Suspense fallback={<p role="status">Đang mở bản nháp…</p>}><MealEditor /></Suspense>; }
