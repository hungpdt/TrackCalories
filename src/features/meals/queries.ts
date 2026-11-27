import "server-only";
import { cache } from "react";
import { todayIn } from "@/lib/dates/today";
import { requireUser } from "@/lib/supabase/server";
import type { DayMeal } from "./types";
import { amountLabel } from "./amount";

// Kiểm tra vòng: "2026-02-30" vẫn parse được trong JS nhưng không khớp lại chuỗi gốc.
export function isCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Bữa mặc định theo giờ hiện tại ở múi giờ hồ sơ (không theo giờ máy chủ hay thiết bị). */
function mealTypeAt(timeZone: string): DayMeal["mealType"] {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "snack";
}

/** Ngày đang xem: tham số ?date hợp lệ, nếu không thì hôm nay theo múi giờ hồ sơ. */
export async function resolveDay(requested: string | undefined) {
  const timezone = await profileTimezone();
  const today = todayIn(timezone);
  return { today, timezone, defaultMealType: mealTypeAt(timezone), date: isCalendarDate(requested) ? requested : today };
}

/** Bữa ăn của một ngày, tổng tính từ total_* của từng item snapshot (không cache tổng). */
type MealRow = {
  id: string; meal_type: string; eaten_at: string; updated_at: string; photo_path: string | null; revision: number;
  meal_items: { id: string; position: number; name_snapshot: string; consumed_quantity: number; consumed_unit: string; serving_label_snapshot: string | null;
    total_kcal: number; total_protein_g: number; total_carbs_g: number; total_fat_g: number; source_snapshot: string }[];
};
const mealSelect = "id, meal_type, eaten_at, updated_at, photo_path, revision, meal_items(id, position, name_snapshot, consumed_quantity, consumed_unit, serving_label_snapshot, total_kcal, total_protein_g, total_carbs_g, total_fat_g, source_snapshot)";

function toDayMeals(rows: MealRow[], timeZone: string): DayMeal[] {
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return rows.map(meal => {
    const items = [...meal.meal_items].sort((x, y) => x.position - y.position).map(item => ({
      id: item.id,
      name: item.name_snapshot,
      amount: amountLabel(Number(item.consumed_quantity), item.consumed_unit, item.serving_label_snapshot),
      kcal: Number(item.total_kcal), protein: Number(item.total_protein_g), carbs: Number(item.total_carbs_g), fat: Number(item.total_fat_g),
      aiEstimate: item.source_snapshot === "ai_estimate",
      grams: item.consumed_unit === "g" ? Number(item.consumed_quantity) : null,
      portionNote: item.serving_label_snapshot,
    }));
    const totals = items.reduce((sum, item) => ({
      kcal: sum.kcal + item.kcal, protein: sum.protein + item.protein, carbs: sum.carbs + item.carbs, fat: sum.fat + item.fat,
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    return {
      id: meal.id, mealType: meal.meal_type as DayMeal["mealType"], items, totals,
      time: clock.format(new Date(meal.eaten_at)),
      // Ảnh qua route của app (điện thoại trong LAN không tới được Supabase local).
      // ?v= đổi khi bữa được cập nhật (kể cả thay ảnh) để không hiện ảnh cũ từ cache.
      photoUrl: meal.photo_path ? `/api/meals/${meal.id}/photo?v=${Date.parse(meal.updated_at)}` : null,
    };
  });
}

// cache(): layout, trang và nhiều query cùng request chỉ đọc múi giờ một lần.
const profileTimezone = cache(async () => {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("profiles").select("timezone").maybeSingle();
  return data?.timezone ?? "Asia/Ho_Chi_Minh";
});

/** Một bữa theo id (RLS chỉ trả bữa của người đăng nhập), kèm ngày ăn. */
export async function getMeal(id: string): Promise<(DayMeal & { date: string; revision: number }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("meals").select(`meal_date, ${mealSelect}`).eq("id", id).maybeSingle();
  if (!data) return null;
  const [meal] = toDayMeals([data as unknown as MealRow], await profileTimezone());
  return { ...meal, date: data.meal_date, revision: data.revision };
}

/** Bữa ăn của một ngày theo giờ ăn mới nhất trước; tổng tính từ total_* của từng item snapshot. */
export async function getMealsOn(date: string): Promise<DayMeal[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("meals").select(mealSelect).eq("meal_date", date).order("eaten_at", { ascending: false });
  if (error) throw new Error("Không đọc được nhật ký.");
  return toDayMeals((data ?? []) as unknown as MealRow[], await profileTimezone());
}

/** Các ngày có ghi bữa trong khoảng (để thanh tuần đánh dấu ngày đã ghi). Gom trong SQL: một dòng/ngày. */
export async function getLoggedDays(from: string, to: string): Promise<string[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("daily_totals", { p_from: from, p_to: to });
  return (data ?? []).map(row => row.meal_date);
}

export async function getLatestWeight(onOrBefore: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("weight_logs").select("weight_kg, logged_date").lte("logged_date", onOrBefore)
    .order("logged_date", { ascending: false }).limit(1).maybeSingle();
  return data ? { kg: Number(data.weight_kg), date: data.logged_date } : null;
}

/** Số ngày liên tiếp có ghi bữa, tính đến hôm nay (hôm nay chưa ghi thì tính đến hôm qua). */
// cache(): layout (pill chuỗi ngày) và trang Tiến độ dùng chung một lần tính trong cùng request.
export const getStreak = cache(async (): Promise<{ days: number; today: boolean }> => {
  const today = todayIn(await profileTimezone());
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 400);
  const logged = new Set(await getLoggedDays(from.toISOString().slice(0, 10), today));
  const cursor = new Date(`${today}T00:00:00Z`);
  const loggedToday = logged.has(today);
  if (!loggedToday) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let days = 0;
  while (logged.has(cursor.toISOString().slice(0, 10))) { days++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return { days, today: loggedToday };
});
