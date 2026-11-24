import { WeightTracker } from "@/features/weight/weight-tracker";
import { getGoalBaseline, listWeights } from "@/features/weight/queries";
import { resolveDay } from "@/features/meals/queries";

export const metadata = { title: "Cân nặng" };

export default async function Page() {
  const { today } = await resolveDay(undefined);
  const [entries, baseline] = await Promise.all([listWeights(), getGoalBaseline(today)]);
  return <WeightTracker entries={entries} today={today} baseline={baseline} />;
}
