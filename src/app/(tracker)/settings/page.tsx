import { Settings } from "@/features/goals/settings";
import { getProfileAndGoal } from "@/features/goals/queries";
import { goalFromDb } from "@/features/goals/profile-mapping";

export const metadata = { title: "Hồ sơ" };

export default async function Page() {
  const { email, timezone, goal, targets } = await getProfileAndGoal();
  return <Settings email={email} timezone={timezone} targets={targets}
    goalType={goal ? goalFromDb[goal.goal_type] ?? null : null} effectiveFrom={goal?.effective_from ?? null} />;
}
