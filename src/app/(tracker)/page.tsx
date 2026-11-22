import { FirstRun } from "@/features/goals/setup";
import { getProfileAndGoal, getTargetsOn } from "@/features/goals/queries";
import { getLatestWeight, getMealsOn, resolveDay } from "@/features/meals/queries";

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await resolveDay((await searchParams).date);
  const [{ draft, targets }, dayTargets, meals, latestWeight] = await Promise.all([
    getProfileAndGoal(), getTargetsOn(date), getMealsOn(date), getLatestWeight(date),
  ]);
  return <FirstRun saved={draft} targets={targets} dashboard={{ date, meals, latestWeight, targets: dayTargets }} />;
}
