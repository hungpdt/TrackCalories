import { describe, expect, it } from "vitest";
import { aiDraftSchema, sanitizeDraft, saveMealSchema, type AiItem } from "@/lib/ai/draft";

const item = (patch: Partial<AiItem> = {}): AiItem => ({
  name: "Cơm trắng", quantity_g: 200, portion_note: null, kcal: 260, protein_g: 5.4, carbs_g: 56, fat_g: 0.6,
  source: "note", needs_review: false, assumptions: [], ...patch,
});

describe("sanitizeDraft", () => {
  it("giữ số hợp lệ và làm tròn một chữ số", () => {
    expect(sanitizeDraft({ items: [item({ kcal: 260.04 })], warnings: [] }).items[0]).toMatchObject({ kcal: 260, quantity_g: 200, needs_review: false });
  });

  it("số âm, vô hạn hoặc quá lớn thành null (không thành 0) và bật cần kiểm tra", () => {
    const [out] = sanitizeDraft({ items: [item({ kcal: -5, protein_g: Number.POSITIVE_INFINITY, carbs_g: 99999, quantity_g: 0 })], warnings: [] }).items;
    expect(out).toMatchObject({ kcal: null, protein_g: null, carbs_g: null, fat_g: 0.6, quantity_g: null, needs_review: true });
  });

  it("bỏ món không tên, cắt chuỗi dài, giới hạn 20 món", () => {
    const many = Array.from({ length: 25 }, (_, index) => item({ name: index === 0 ? "   " : `Món ${index}` }));
    const out = sanitizeDraft({ items: many, warnings: ["x".repeat(500)] });
    expect(out.items).toHaveLength(20);
    expect(out.items[0].name).toBe("Món 1");
    expect(out.warnings[0]).toHaveLength(200);
  });

  it("schema AI chấp nhận null cho dinh dưỡng chưa biết", () => {
    expect(aiDraftSchema.safeParse({ items: [item({ kcal: null })], warnings: [] }).success).toBe(true);
    expect(aiDraftSchema.safeParse({ items: [{ ...item(), kcal: "260" }], warnings: [] }).success).toBe(false);
  });
});

describe("saveMealSchema", () => {
  const valid = {
    requestId: "6f1c8a5e-3a59-4b8e-9a5a-0d2f7d3c1b2a", mealDate: "2026-11-22", mealType: "lunch",
    items: [{ name: "Cơm", grams: 200, portionNote: null, kcal: 260, protein_g: 5, carbs_g: 56, fat_g: 1, source: "ai_estimate", assumptions: [] }],
  };
  it("nhận bản nháp đã đủ số", () => expect(saveMealSchema.safeParse(valid).success).toBe(true));
  it.each([
    ["thiếu kcal (null)", { kcal: null }], ["kcal âm", { kcal: -1 }], ["gram 0", { grams: 0 }], ["tên rỗng", { name: "  " }],
  ])("từ chối %s", (_, patch) => {
    expect(saveMealSchema.safeParse({ ...valid, items: [{ ...valid.items[0], ...patch }] }).success).toBe(false);
  });
  it("từ chối bữa rỗng và ngày sai định dạng", () => {
    expect(saveMealSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(saveMealSchema.safeParse({ ...valid, mealDate: "22/11/2026" }).success).toBe(false);
  });
});
