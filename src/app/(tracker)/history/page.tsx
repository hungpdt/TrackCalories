import { History } from "@/features/meals/history";
import { getMealsOn, resolveDay } from "@/features/meals/queries";

export const metadata = { title: "Nhật ký" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; saved?: string; library?: string }> }) {
  const params = await searchParams;
  const { date } = await resolveDay(params.date);
  const notice = params.saved === "1"
    ? params.library === "failed" ? "Đã lưu bữa ăn, nhưng chưa thêm được món vào kho." : "Đã lưu bữa ăn."
    : undefined;
  return <History date={date} meals={await getMealsOn(date)} notice={notice} />;
}
