import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, inject, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

// Sửa theo review 25/11/2026: tổng theo ngày gom trong SQL; hạn mức AI không lách được bằng đổi múi giờ.
type Client = SupabaseClient<Database>;
const { url, anonKey, serviceKey } = inject("supabase");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, serviceKey, options);

async function newUser(label: string) {
  const email = `${label}-${randomUUID()}@example.test`;
  const created = await admin.auth.admin.createUser({ email, password: "test-password-123", email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
  const client = createClient<Database>(url, anonKey, options);
  const signed = await client.auth.signInWithPassword({ email, password: "test-password-123" });
  if (signed.error) throw signed.error;
  return { id: created.data.user.id, client };
}
const item = (kcal: number) => ({ name: "Món giả lập", kcal, protein_g: 10, carbs_g: 20, fat_g: 5, source: "manual",
  basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", consumed_quantity: 1, consumed_unit: "serving" });
async function meal(c: Client, date: string, kcals: number[]) {
  const { error } = await c.rpc("save_meal", { p_request_id: randomUUID(), p_meal: { meal_date: date, meal_type: "lunch" }, p_items: kcals.map(item) });
  if (error) throw error;
}

let a: { id: string; client: Client };
let b: { id: string; client: Client };
beforeAll(async () => { [a, b] = await Promise.all([newUser("ra"), newUser("rb")]); });

describe("daily_totals", () => {
  it("cộng theo ngày, chỉ dữ liệu của người gọi, một dòng mỗi ngày", async () => {
    await meal(a.client, "2026-11-01", [100, 50]);
    await meal(a.client, "2026-11-01", [30]);
    await meal(a.client, "2026-11-03", [200]);
    await meal(b.client, "2026-11-01", [999]);
    const { data, error } = await a.client.rpc("daily_totals", { p_from: "2026-10-01", p_to: "2026-11-30" });
    expect(error).toBeNull();
    expect(data?.map(row => [row.meal_date, Number(row.kcal), Number(row.protein_g)])).toEqual([["2026-11-01", 180, 30], ["2026-11-03", 200, 10]]);
  });
  it("khách chưa đăng nhập không gọi được; khoảng quá dài trả rỗng", async () => {
    const anon = createClient<Database>(url, anonKey, options);
    expect((await anon.rpc("daily_totals", { p_from: "2026-01-01", p_to: "2026-12-31" })).error).not.toBeNull();
    expect((await a.client.rpc("daily_totals", { p_from: "2020-01-01", p_to: "2026-12-31" })).data).toEqual([]);
  });
});

describe("consume_ai_quota theo ngày cố định", () => {
  it("đổi múi giờ hồ sơ không thêm lượt", async () => {
    expect((await a.client.rpc("consume_ai_quota", { p_daily_limit: 2 })).data).toBe(1);
    expect((await a.client.from("profiles").update({ timezone: "Pacific/Kiritimati" }).eq("id", a.id)).error).toBeNull();
    expect((await a.client.rpc("consume_ai_quota", { p_daily_limit: 2 })).data).toBe(0);
    expect((await a.client.from("profiles").update({ timezone: "Pacific/Pago_Pago" }).eq("id", a.id)).error).toBeNull();
    expect((await a.client.rpc("consume_ai_quota", { p_daily_limit: 2 })).error?.message).toContain("ai_quota_exceeded");
  });
});
