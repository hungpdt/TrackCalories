import { notFound } from "next/navigation";
import { z } from "zod";
import { FoodForm } from "@/features/foods/food-form";
import { getFood } from "@/features/foods/queries";

export const metadata = { title: "Sửa món" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const food = await getFood(id);
  if (!food) notFound();
  return <FoodForm food={food} />;
}
