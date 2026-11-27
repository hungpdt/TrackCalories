import { describe, expect, it } from "vitest";
import { adaptiveTdee } from "@/lib/nutrition/adaptive";

const today = "2026-11-28";
const day = (offset: number) => new Date(Date.parse(`${today}T00:00:00Z`) - offset * 86_400_000).toISOString().slice(0, 10);
const intake = (n: number, kcal = 2000) => Array.from({ length: n }, (_, i) => ({ date: day(i + 1), kcal }));

describe("adaptiveTdee", () => {
  it("giảm đều 0,5 kg/tuần khi ăn 2000 kcal → TDEE ≈ 2550", () => {
    const weights = [1, 5, 9, 13, 17, 20].map(d => ({ date: day(d), kg: 80 + (d * 0.5) / 7 }));
    const result = adaptiveTdee({ today, intake: intake(20), weights });
    expect(result).toMatchObject({ ok: true, avgIntake: 2000, kgPerWeek: -0.5, tdee: 2550, loggedDays: 20, weighIns: 6 });
  });

  it("cân nặng giữ nguyên → TDEE bằng lượng ăn trung bình; bỏ qua hôm nay và ngày kcal 0", () => {
    const weights = [2, 8, 14, 19].map(d => ({ date: day(d), kg: 70 }));
    const extra = [{ date: today, kcal: 5000 }, { date: day(21), kcal: 0 }];
    expect(adaptiveTdee({ today, intake: [...intake(15, 1800), ...extra], weights })).toMatchObject({ ok: true, tdee: 1800, loggedDays: 15 });
  });

  it("chưa đủ ngày ghi bữa hoặc số đo thì báo lý do", () => {
    expect(adaptiveTdee({ today, intake: intake(10), weights: [] })).toMatchObject({ ok: false, reason: "few_logged_days", loggedDays: 10 });
    const close = [1, 2, 3, 4].map(d => ({ date: day(d), kg: 70 }));
    expect(adaptiveTdee({ today, intake: intake(18), weights: close })).toMatchObject({ ok: false, reason: "few_weighins", weighIns: 4 });
  });
});
