import { z } from "zod";

// Hợp đồng AI ↔ app cho màn "Ghi nhanh" (PRD 4.2a). Dùng được ở cả server và client.
// Schema gửi cho model không có ràng buộc số (structured output strict); kiểm tra lại bằng sanitizeDraft.
export const aiItemSchema = z.object({
  name: z.string(),
  quantity_g: z.number().nullable(),
  portion_note: z.string().nullable(),
  kcal: z.number().nullable(),
  protein_g: z.number().nullable(),
  carbs_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  source: z.enum(["note", "photo", "both"]),
  needs_review: z.boolean(),
  assumptions: z.array(z.string()),
});

export const aiDraftSchema = z.object({
  items: z.array(aiItemSchema),
  warnings: z.array(z.string()),
});

export type AiItem = z.infer<typeof aiItemSchema>;
export type AiDraft = z.infer<typeof aiDraftSchema>;

const MAX_ITEMS = 20;
const text = (value: string, max: number) => Array.from(value.trim()).slice(0, max).join("");
const amount = (value: number | null, max: number) =>
  value === null || !Number.isFinite(value) || value < 0 || value > max ? null : Math.round(value * 10) / 10;

/** Chuẩn hóa output model: số âm/vô hạn/quá lớn thành null (không thành 0), cắt chuỗi, bỏ món không tên. */
export function sanitizeDraft(draft: AiDraft): AiDraft {
  const items = draft.items
    .map(item => {
      const grams = amount(item.quantity_g, 5000);
      const values = {
        kcal: amount(item.kcal, 10000),
        protein_g: amount(item.protein_g, 2000),
        carbs_g: amount(item.carbs_g, 2000),
        fat_g: amount(item.fat_g, 2000),
      };
      return {
        name: text(item.name, 120),
        quantity_g: grams === 0 ? null : grams,
        portion_note: item.portion_note ? text(item.portion_note, 60) || null : null,
        ...values,
        source: item.source,
        // Thiếu hoặc bị loại bất kỳ giá trị nào (sau khi chuẩn hóa) thì bắt buộc người dùng kiểm tra.
        needs_review: item.needs_review || Object.values(values).some(v => v === null),
        assumptions: item.assumptions.map(a => text(a, 200)).filter(Boolean).slice(0, 8),
      };
    })
    .filter(item => item.name.length > 0)
    .slice(0, MAX_ITEMS);
  return { items, warnings: draft.warnings.map(w => text(w, 200)).filter(Boolean).slice(0, 5) };
}

export const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
export const mealTypeLabels: Record<(typeof mealTypes)[number], string> = {
  breakfast: "Bữa sáng", lunch: "Bữa trưa", dinner: "Bữa tối", snack: "Bữa phụ",
};

/** Dữ liệu gửi lên khi người dùng xác nhận lưu bữa. Bốn giá trị dinh dưỡng bắt buộc (không null). */
export const saveMealSchema = z.object({
  requestId: z.uuid(),
  mealDate: z.iso.date(),
  mealType: z.enum(mealTypes),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    grams: z.number().positive().max(5000).nullable(),
    portionNote: z.string().trim().max(60).nullable(),
    kcal: z.number().min(0).max(10000),
    protein_g: z.number().min(0).max(2000),
    carbs_g: z.number().min(0).max(2000),
    fat_g: z.number().min(0).max(2000),
    source: z.enum(["ai_estimate", "manual"]),
    assumptions: z.array(z.string().max(200)).max(10),
  })).min(1).max(20),
});

export type SaveMealInput = z.infer<typeof saveMealSchema>;
