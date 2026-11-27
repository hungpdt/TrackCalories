import { WeightTracker } from "@/features/weight/weight-tracker";
import { getGoalBaseline, listWeights } from "@/features/weight/queries";
import { getStreak, getLoggedDays, resolveDay } from "@/features/meals/queries";
import { getBodyGoal, getDailyTotals } from "@/features/progress/queries";
import { ProgressCards, EnergyCards } from "@/features/progress/progress";

export const metadata = { title: "Tiến độ" };

export default async function Page() {
  const { today } = await resolveDay(undefined);
  const week = new Date(`${today}T00:00:00Z`);
  week.setUTCDate(week.getUTCDate() - 6);
  const [entries, baseline, streak, loggedDays, totals, body] = await Promise.all([
    listWeights(), getGoalBaseline(today), getStreak(), getLoggedDays(week.toISOString().slice(0, 10), today), getDailyTotals(today), getBodyGoal(today),
  ]);
  return <WeightTracker entries={entries} today={today} baseline={baseline}
    top={<ProgressCards streak={streak} loggedDays={loggedDays} today={today} />}
    bottom={<EnergyCards totals={totals} today={today} entries={entries} heightCm={body.heightCm} targetKg={body.targetKg} goalKcal={body.goalKcal} weeklyKcal={body.weeklyKcal} />} />;
}
