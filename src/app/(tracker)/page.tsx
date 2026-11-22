import { FirstRun } from "@/features/goals/setup";
import { getProfileAndGoal } from "@/features/goals/queries";

export default async function Page() {
  const { draft, targets } = await getProfileAndGoal();
  return <FirstRun saved={draft} targets={targets} />;
}
