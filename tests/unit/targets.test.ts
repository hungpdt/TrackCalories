import { describe, expect, it } from "vitest";
import { calculateTargets, emptyProfile, looksLikeThousands, parseDecimal, readBody, type ProfileDraft } from "@/lib/nutrition/targets";

// Số đo giả lập cho kiểm thử, không phải dữ liệu người dùng thật.
const base: ProfileDraft = { ...emptyProfile, weight: "80", height: "180", age: "30", sex: "male", activity: "moderate", goal: "loss", weekly: "1750" };
const draft = (patch: Partial<ProfileDraft>) => ({ ...base, ...patch });

describe("parseDecimal", () => {
  it.each([
    ["75,5", 75.5], ["75.5", 75.5], [" 12 ", 12], ["1.25", 1.25], ["0", 0], ["1,2345", 1.2345],
  ])("đọc %j thành %d", (input, expected) => expect(parseDecimal(input)).toBe(expected));

  it.each(["1.200", "12.500", "1.000.000", "1e3", "-5", "abc", "", "1,2,3", "1,", ",5", "Infinity"])(
    "từ chối %j", input => expect(parseDecimal(input)).toBeNaN());

  it("nhận diện dạng giống hàng nghìn", () => {
    expect(looksLikeThousands("1.200")).toBe(true);
    expect(looksLikeThousands("1.25")).toBe(false);
    expect(looksLikeThousands("1200")).toBe(false);
  });
});

describe("readBody", () => {
  it("giữ phần thập phân sau dấu phẩy", () => {
    const body = readBody(draft({ weight: "80,5" }));
    expect("error" in body ? body.error : body.weight).toBe(80.5);
  });

  it("báo lỗi cân nặng dạng hàng nghìn thay vì đổi số", () => {
    expect(readBody(draft({ weight: "75.500" }))).toHaveProperty("error");
  });
});

describe("calculateTargets", () => {
  it("giảm cân: Mifflin, hệ số vận động, ÷7 và chia macro", () => {
    expect(calculateTargets(base).plan).toMatchObject({
      resting: 1780, maintenance: 2759, kcal: 2509, protein: 128, fat: 70, carbs: 342, signedWeekly: -1750, lowIntake: false,
    });
  });

  it("phần thập phân của cân nặng ảnh hưởng kết quả", () => {
    expect(calculateTargets(draft({ weight: "80,5" })).plan).toMatchObject({ resting: 1785, maintenance: 2767 });
  });

  it("tăng cân và tăng cơ giảm mỡ áp dụng đúng dấu", () => {
    expect(calculateTargets(draft({ goal: "gain", weekly: "1400" })).plan?.kcal).toBe(2959);
    expect(calculateTargets(draft({ goal: "recomposition", weekly: "700" })).plan?.kcal).toBe(2659);
  });

  it("tăng cơ giảm mỡ cho phép mức điều chỉnh 0", () => {
    expect(calculateTargets(draft({ goal: "recomposition", weekly: "0" })).plan?.kcal).toBe(2759);
  });

  it("duy trì dưới 1200 kcal vẫn có mục tiêu, kèm cờ lưu ý", () => {
    const low = draft({ weight: "45", height: "150", age: "70", sex: "female", activity: "low", goal: "maintain", weekly: "" });
    expect(calculateTargets(low)).toMatchObject({ plan: { resting: 877, maintenance: 1052, kcal: 1052, lowIntake: true } });
    expect(calculateTargets({ ...low, goal: "loss", weekly: "1750" })).toHaveProperty("error");
  });

  it("chặn thâm hụt khi BMI dưới 18,5 nhưng vẫn cho duy trì", () => {
    const thin = draft({ weight: "50", height: "180" });
    expect(calculateTargets(thin).error).toContain("BMI");
    expect(calculateTargets({ ...thin, goal: "maintain", weekly: "" }).plan).toBeDefined();
  });

  it("chặn mức điều chỉnh tuần ngoài giới hạn", () => {
    expect(calculateTargets(draft({ weekly: "3501" })).error).toContain("3500");
    expect(calculateTargets(draft({ weekly: "0" })).error).toBeDefined();
    expect(calculateTargets(draft({ weekly: "1.750" })).error).toBeDefined();
  });

  it("chặn thâm hụt vượt 20% mức duy trì", () => {
    expect(calculateTargets(draft({ activity: "low", weekly: "3500" })).error).toContain("quá thấp");
  });
});
