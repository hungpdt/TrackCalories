import "server-only";
import type { requireUser } from "@/lib/supabase/server";
import { eatenAtFor } from "./today";

/** Giờ ăn cho bữa mới: hôm nay = giờ hiện tại; ghi bù ngày khác = giờ điển hình của bữa theo múi giờ hồ sơ. */
export async function eatenAt(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], mealDate: string, mealType: Parameters<typeof eatenAtFor>[1]) {
  const { data } = await supabase.from("profiles").select("timezone").maybeSingle();
  return eatenAtFor(mealDate, mealType, data?.timezone ?? "Asia/Ho_Chi_Minh");
}
