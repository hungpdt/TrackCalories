import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, inject, it } from "vitest";
import { exportAccount, importAccount } from "../../scripts/backup-lib.mjs";

// npm run backup / restore: xuất và nhập lại dữ liệu qua tài khoản của chính người dùng (RLS), không cần service key.
const { url, anonKey, serviceKey } = inject("supabase");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

async function newUser(label: string) {
  const email = `${label}-${randomUUID()}@example.test`;
  const created = await admin.auth.admin.createUser({ email, password: "test-password-123", email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
  const client = createClient(url, anonKey, options);
  const signed = await client.auth.signInWithPassword({ email, password: "test-password-123" });
  if (signed.error) throw signed.error;
  return { id: created.data.user.id, client };
}

describe("sao lưu và khôi phục", () => {
  it("xuất từ tài khoản A, nhập vào tài khoản trống B giữ đủ dữ liệu, tổng và ảnh", async () => {
    const a = await newUser("ba");
    expect((await a.client.from("profiles").update({ height_cm: 170, display_name: "Thử" }).eq("id", a.id)).error).toBeNull();
    expect((await a.client.from("goals").insert({ goal_type: "lose", daily_kcal: 2000, protein_g: 120, carbs_g: 200, fat_g: 60, effective_from: "2026-11-01", target_weight_kg: 65 })).error).toBeNull();
    expect((await a.client.from("weight_logs").insert({ logged_date: "2026-11-02", weight_kg: 70.4 })).error).toBeNull();
    const food = await a.client.from("foods").insert({ name: "Phở bò", basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", serving_label: "1 tô",
      kcal: 450, protein_g: 25, carbs_g: 60, fat_g: 12, source: "manual" }).select("id").single();
    expect(food.error).toBeNull();
    const saved = await a.client.rpc("save_meal", { p_request_id: randomUUID(), p_meal: { meal_date: "2026-11-02", meal_type: "lunch", eaten_at: "2026-11-02T05:15:00Z", note: "trưa" },
      p_items: [
        { food_id: food.data!.id, name: "Phở bò", basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", serving_label: "1 tô",
          consumed_quantity: 2, consumed_unit: "serving", kcal: 450, protein_g: 25, carbs_g: 60, fat_g: 12, source: "library" },
        { name: "Trà đá", basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", consumed_quantity: 1, consumed_unit: "serving",
          kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, source: "manual", manual_override: true, total_kcal: 3, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, assumptions: ["ước"] },
      ] });
    expect(saved.error).toBeNull();
    const mealId = (saved.data as { meal_id: string }).meal_id;
    expect((await a.client.storage.from("meal-photos").upload(`${a.id}/${mealId}.jpg`, new Blob([jpeg], { type: "image/jpeg" }), { contentType: "image/jpeg" })).error).toBeNull();
    expect((await a.client.from("meals").update({ photo_path: `${a.id}/${mealId}.jpg` }).eq("id", mealId)).error).toBeNull();

    const backup = await exportAccount(a.client);
    expect(backup.data.tables.meals).toHaveLength(1);
    expect(backup.photos.get(mealId)).toEqual(jpeg);
    // Đi qua JSON như file thật.
    const data = JSON.parse(JSON.stringify(backup.data));

    const b = await newUser("bb");
    const summary = await importAccount(b.client, data, async id => backup.photos.get(id) ?? null, randomUUID);
    expect(summary).toMatchObject({ profile: true, goals: 1, foods: 1, weight_logs: 1, meals: 1, photos: 1, photoErrors: 0 });

    const restored = await exportAccount(b.client);
    const t = restored.data.tables;
    expect(t.profiles[0]).toMatchObject({ height_cm: 170, display_name: "Thử" });
    expect(t.goals[0]).toMatchObject({ target_weight_kg: 65, effective_from: "2026-11-01" });
    expect(Number(t.weight_logs[0].weight_kg)).toBe(70.4);
    const meal = t.meals[0];
    expect(meal).toMatchObject({ meal_date: "2026-11-02", meal_type: "lunch", note: "trưa" });
    expect(Date.parse(String(meal.eaten_at))).toBe(Date.parse("2026-11-02T05:15:00Z"));
    const items = [...t.meal_items].sort((x, y) => Number(x.position) - Number(y.position));
    expect(items.map(i => [i.name_snapshot, i.food_id, Number(i.consumed_quantity), Number(i.total_kcal), i.source_snapshot])).toEqual([
      ["Phở bò", t.foods[0].id, 2, 900, "library"], ["Trà đá", null, 1, 3, "manual"],
    ]);
    expect(t.foods[0].id).not.toBe(food.data!.id);
    expect(items[1].assumptions_snapshot).toEqual(["ước"]);
    expect(restored.photos.size).toBe(1);

    // Không trộn vào tài khoản đã có dữ liệu; không đọc được dữ liệu người khác.
    await expect(importAccount(b.client, data, async () => null, randomUUID)).rejects.toThrow("đã có dữ liệu");
    expect((await b.client.from("meals").select("id")).data).toHaveLength(1);
  });
});
