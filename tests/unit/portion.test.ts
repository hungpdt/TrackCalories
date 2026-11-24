import { describe, expect, it } from "vitest";
import { availableUnits, portionFactor, portionTotals, type FoodBasis } from "@/lib/nutrition/portion";
import { matchesQuery, normalizeVi } from "@/lib/text/search";

// Ví dụ giả định theo PRD mục 5, không phải dữ liệu sản phẩm thật.
const food = (patch: Partial<FoodBasis>): FoodBasis => ({
  basisType: "per_100g", basisQuantity: 100, servingMassG: null, servingVolumeMl: null, kcal: 0, protein: 0, carbs: 0, fat: 0, ...patch,
});
const round = (n: Record<string, number> | null) => n && Object.fromEntries(Object.entries(n).map(([k, v]) => [k, Math.round(v * 1000) / 1000]));

describe("portionTotals", () => {
  it("100 ml: uống 250 ml → 150 kcal, P 12,5, C 6,75, F 8", () => {
    const milk = food({ basisType: "per_100ml", kcal: 60, protein: 5, carbs: 2.7, fat: 3.2 });
    expect(round(portionTotals(milk, 250, "ml"))).toEqual({ kcal: 150, protein: 12.5, carbs: 6.75, fat: 8 });
  });

  it("khẩu phần 30 g: ăn 45 g → 180 kcal", () => {
    const cereal = food({ basisType: "per_serving", basisQuantity: 1, servingMassG: 30, kcal: 120, protein: 3, carbs: 20, fat: 3 });
    expect(round(portionTotals(cereal, 45, "g"))).toEqual({ kcal: 180, protein: 4.5, carbs: 30, fat: 4.5 });
  });

  it("cả gói 400 kcal, 200 g: ăn 50 g → 100 kcal; nửa gói → 200 kcal", () => {
    const pack = food({ basisType: "per_package", basisQuantity: 1, servingMassG: 200, kcal: 400 });
    expect(portionTotals(pack, 50, "g")?.kcal).toBe(100);
    expect(portionTotals(pack, 0.5, "package")?.kcal).toBe(200);
  });

  it("1,5 tô phở (cơ sở 1 khẩu phần)", () => {
    const pho = food({ basisType: "per_serving", basisQuantity: 1, kcal: 450, protein: 28, carbs: 58, fat: 12 });
    expect(round(portionTotals(pho, 1.5, "serving"))).toEqual({ kcal: 675, protein: 42, carbs: 87, fat: 18 });
  });

  it("cơ sở 100 g có khối lượng khẩu phần: 2 khẩu phần 60 g → hệ số 1,2", () => {
    expect(portionFactor(food({ servingMassG: 60, kcal: 100 }), 2, "serving")).toBeCloseTo(1.2);
  });

  it("không tự đổi ml ↔ g, không quy đổi khẩu phần khi thiếu khối lượng", () => {
    expect(portionFactor(food({ basisType: "per_100ml" }), 100, "g")).toBeNull();
    expect(portionFactor(food({ basisType: "per_100g" }), 100, "ml")).toBeNull();
    expect(portionFactor(food({ basisType: "per_serving", basisQuantity: 1 }), 100, "g")).toBeNull();
    expect(portionFactor(food({ basisType: "per_100g" }), 1, "serving")).toBeNull();
  });

  it("lượng không hợp lệ trả null", () => {
    expect(portionFactor(food({}), 0, "g")).toBeNull();
    expect(portionFactor(food({}), Number.NaN, "g")).toBeNull();
  });

  it("đơn vị chọn được theo món", () => {
    expect(availableUnits(food({ basisType: "per_serving", basisQuantity: 1 }))).toEqual(["serving"]);
    expect(availableUnits(food({ basisType: "per_serving", basisQuantity: 1, servingMassG: 500 }))).toEqual(["serving", "g"]);
    expect(availableUnits(food({ servingMassG: 150 }))).toEqual(["g", "serving"]);
  });
});

describe("tìm kiếm không dấu", () => {
  it("chuẩn hóa dấu, đ, hoa thường, khoảng trắng", () => {
    expect(normalizeVi("  Phở  Bò ĐẶC BIỆT ")).toBe("pho bo dac biet");
  });
  it("khớp mọi từ, thứ tự tùy ý", () => {
    expect(matchesQuery("Phở bò tái lăn", "pho bo")).toBe(true);
    expect(matchesQuery("Phở bò tái lăn", "lan tai")).toBe(true);
    expect(matchesQuery("Bún chả", "pho")).toBe(false);
    expect(matchesQuery("Bất kỳ", "")).toBe(true);
  });
});
