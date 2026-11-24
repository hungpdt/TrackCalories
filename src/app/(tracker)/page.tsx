import { FirstRun } from "@/features/goals/setup";
import { getProfileAndGoal, getTargetsOn } from "@/features/goals/queries";
import { getLoggedDays, getMealsOn, resolveDay } from "@/features/meals/queries";

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; saved?: string; library?: string; photo?: string }> }) {
  const params = await searchParams;
  const { date, today } = await resolveDay(params.date);
  const [{ draft, targets }, dayTargets, meals, loggedDays] = await Promise.all([
    getProfileAndGoal(), getTargetsOn(date), getMealsOn(date), getLoggedDays(shiftDate(date < today ? date : today, -180), today),
  ]);
  const notice = params.saved === "1"
    ? ["Đã lưu bữa ăn.", params.library === "failed" && "Chưa thêm được món vào kho.", params.photo === "failed" && "Chưa lưu được ảnh."].filter(Boolean).join(" ")
    : undefined;
  return <FirstRun saved={draft} targets={targets} dashboard={{ date, today, meals, loggedDays, notice, targets: dayTargets }} />;
}
