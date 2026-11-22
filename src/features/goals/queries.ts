import "server-only";
import { todayIn } from "@/lib/dates/today";
import { requireUser } from "@/lib/supabase/server";
import { draftFromRows, targetsFromGoal } from "./profile-mapping";

/** Hồ sơ + mục tiêu có hiệu lực hôm nay (theo múi giờ hồ sơ) + cân nặng gần nhất của người đang đăng nhập. */
export async function getProfileAndGoal() {
  const { supabase, email } = await requireUser();
  const { data: profile, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) throw new Error("Không đọc được hồ sơ.");
  const timezone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = todayIn(timezone);
  const [goalRes, weightRes] = await Promise.all([
    supabase.from("goals").select("*").lte("effective_from", today).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("weight_logs").select("weight_kg").lte("logged_date", today).order("logged_date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (goalRes.error || weightRes.error) throw new Error("Không đọc được mục tiêu.");
  const goal = goalRes.data;
  return {
    email,
    timezone,
    goal,
    targets: targetsFromGoal(goal),
    draft: draftFromRows(profile, goal, weightRes.data ? Number(weightRes.data.weight_kg) : null),
  };
}
