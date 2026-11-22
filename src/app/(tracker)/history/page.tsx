import { History } from "@/features/meals/history";
import { getMealsOn, resolveDay } from "@/features/meals/queries";

export const metadata = { title: "Nhật ký" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await resolveDay((await searchParams).date);
  return <History date={date} meals={await getMealsOn(date)} />;
}
