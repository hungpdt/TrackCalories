/** Năng lượng tương đương 1 kg thay đổi cân nặng (ước tính phổ biến, gồm cả mỡ và nước/glycogen). */
export const KCAL_PER_KG = 7700;
/** Số ngày gần nhất dùng để tính (không tính hôm nay vì có thể chưa ghi xong). */
export const ADAPTIVE_WINDOW = 21;
export const MIN_LOGGED_DAYS = 14;
export const MIN_WEIGHINS = 4;
export const MIN_WEIGHT_SPAN = 10;

export type AdaptiveInput = {
  today: string;
  /** Tổng kcal theo ngày (chỉ ngày có ghi bữa). */
  intake: { date: string; kcal: number }[];
  weights: { date: string; kg: number }[];
};

export type AdaptiveResult =
  | { ok: true; tdee: number; avgIntake: number; kgPerWeek: number; loggedDays: number; weighIns: number; from: string; to: string }
  | { ok: false; reason: "few_logged_days" | "few_weighins"; loggedDays: number; weighIns: number; needDays: number; needWeighIns: number };

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * TDEE thích ứng: TDEE ≈ kcal ăn trung bình − (tốc độ đổi cân nặng × 7700).
 * Tốc độ đổi cân lấy từ đường hồi quy tuyến tính qua mọi số đo trong cửa sổ (đỡ nhiễu nước/muối hơn so sánh hai ngày).
 * Chỉ dùng ngày có ghi bữa để tính trung bình; ngày ghi thiếu món sẽ làm kết quả thấp hơn thực tế.
 */
export function adaptiveTdee({ today, intake, weights }: AdaptiveInput): AdaptiveResult {
  const to = shift(today, -1);
  const from = shift(today, -ADAPTIVE_WINDOW);
  const days = intake.filter(day => day.date >= from && day.date <= to && day.kcal > 0);
  const points = weights.filter(point => point.date >= from && point.date <= to);
  const span = points.length ? Math.max(...points.map(p => dayNumber(p.date))) - Math.min(...points.map(p => dayNumber(p.date))) : 0;
  const base = { loggedDays: days.length, weighIns: points.length, needDays: MIN_LOGGED_DAYS, needWeighIns: MIN_WEIGHINS };
  if (days.length < MIN_LOGGED_DAYS) return { ok: false, reason: "few_logged_days", ...base };
  if (points.length < MIN_WEIGHINS || span < MIN_WEIGHT_SPAN) return { ok: false, reason: "few_weighins", ...base };

  const avgIntake = days.reduce((sum, day) => sum + day.kcal, 0) / days.length;
  const xs = points.map(p => dayNumber(p.date));
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = points.reduce((a, p) => a + p.kg, 0) / points.length;
  const slope = points.reduce((a, p, i) => a + (xs[i] - meanX) * (p.kg - meanY), 0) / xs.reduce((a, x) => a + (x - meanX) ** 2, 0);
  return {
    ok: true, tdee: Math.round(avgIntake - slope * KCAL_PER_KG), avgIntake: Math.round(avgIntake),
    kgPerWeek: Math.round(slope * 7 * 100) / 100, loggedDays: days.length, weighIns: points.length, from, to,
  };
}
