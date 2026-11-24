import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, inject, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

// Ảnh bữa ăn: bucket riêng tư meal-photos, thư mục <user_id>/. Ảnh giả lập (vài byte), không phải ảnh thật.
type Client = SupabaseClient<Database>;
const { url, anonKey, serviceKey } = inject("supabase");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, serviceKey, options);
const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });

async function newUser(label: string) {
  const email = `${label}-${randomUUID()}@example.test`;
  const created = await admin.auth.admin.createUser({ email, password: "test-password-123", email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
  const client = createClient<Database>(url, anonKey, options);
  const signed = await client.auth.signInWithPassword({ email, password: "test-password-123" });
  if (signed.error) throw signed.error;
  return { id: created.data.user.id, client };
}
async function newMeal(c: Client) {
  const { data, error } = await c.rpc("save_meal", { p_request_id: randomUUID(), p_meal: { meal_date: "2026-11-24", meal_type: "lunch" },
    p_items: [{ name: "Món giả lập", kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1, source: "manual", basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", consumed_quantity: 1, consumed_unit: "serving" }] });
  if (error) throw error;
  return String((data as { meal_id: string }).meal_id);
}

let a: { id: string; client: Client };
let b: { id: string; client: Client };
beforeAll(async () => { [a, b] = await Promise.all([newUser("pa"), newUser("pb")]); });

describe("ảnh bữa ăn", () => {
  it("chủ bữa tải ảnh, gắn photo_path và đọc được; người khác không đọc/ghi/xóa được", async () => {
    const mealId = await newMeal(a.client);
    const path = `${a.id}/${mealId}.jpg`;
    expect((await a.client.storage.from("meal-photos").upload(path, jpeg, { contentType: "image/jpeg" })).error).toBeNull();
    expect((await a.client.from("meals").update({ photo_path: path }).eq("id", mealId)).error).toBeNull();
    expect((await a.client.storage.from("meal-photos").createSignedUrl(path, 60)).data?.signedUrl).toBeTruthy();

    expect((await b.client.storage.from("meal-photos").createSignedUrl(path, 60)).data).toBeNull();
    expect((await b.client.storage.from("meal-photos").upload(path, jpeg, { contentType: "image/jpeg", upsert: true })).error).not.toBeNull();
    expect((await b.client.storage.from("meal-photos").upload(`${a.id}/${randomUUID()}.jpg`, jpeg, { contentType: "image/jpeg" })).error).not.toBeNull();
    await b.client.storage.from("meal-photos").remove([path]);
    expect((await a.client.storage.from("meal-photos").createSignedUrl(path, 60)).data?.signedUrl).toBeTruthy();

    // B không sửa được photo_path bữa của A (RLS lọc mất hàng).
    await b.client.from("meals").update({ photo_path: null }).eq("id", mealId);
    expect((await a.client.from("meals").select("photo_path").eq("id", mealId).single()).data?.photo_path).toBe(path);
    // Ảnh không đọc được khi chưa đăng nhập.
    const anon = createClient<Database>(url, anonKey, options);
    expect((await anon.storage.from("meal-photos").createSignedUrl(path, 60)).data).toBeNull();
  });

  it("chỉ sửa được cột ảnh; đường dẫn phải nằm trong thư mục của mình; chỉ nhận JPEG", async () => {
    const mealId = await newMeal(a.client);
    expect((await a.client.from("meals").update({ photo_path: `${b.id}/${mealId}.jpg` }).eq("id", mealId)).error).not.toBeNull();
    expect((await a.client.from("meals").update({ photo_path: "../x.jpg" }).eq("id", mealId)).error).not.toBeNull();
    expect((await a.client.from("meals").update({ meal_type: "dinner" }).eq("id", mealId)).error).not.toBeNull();
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
    expect((await a.client.storage.from("meal-photos").upload(`${a.id}/${randomUUID()}.jpg`, png, { contentType: "image/png" })).error).not.toBeNull();
  });
});
