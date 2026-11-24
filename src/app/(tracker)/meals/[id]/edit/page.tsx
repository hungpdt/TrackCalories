import { notFound } from "next/navigation";
import { EditMeal } from "@/features/meals/edit-meal";
import { getMeal } from "@/features/meals/queries";

export const metadata = { title: "Sửa bữa ăn" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const meal = await getMeal((await params).id);
  if (!meal) notFound();
  return <EditMeal meal={meal} />;
}
