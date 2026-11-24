import { notFound } from "next/navigation";
import { MealDetail } from "@/features/meals/meal-detail";
import { getMeal } from "@/features/meals/queries";

export const metadata = { title: "Chi tiết bữa ăn" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const meal = await getMeal((await params).id);
  if (!meal) notFound();
  return <MealDetail meal={meal} />;
}
