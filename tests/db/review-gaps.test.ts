import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, inject, it } from "vitest";
import type { Database, Json } from "@/lib/supabase/database.types";

// Bổ sung theo review G2. Dữ liệu giả lập, không phải dữ liệu sức khỏe thật.
type Client = SupabaseClient<Database>;
const { url, anonKey, serviceKey } = inject("supabase");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, serviceKey, options);
const password = "test-password-123";

async function newUser(label: string): Promise<{ id: string; client: Client }> {
  const email = `${label}-${randomUUID()}@example.test`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
  const client = createClient<Database>(url, anonKey, options);
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  return { id: created.data.user.id, client };
}

const meal = { meal_date: "2026-11-22", meal_type: "lunch" };
const base = { name: "Món giả lập", kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 1, source: "manual" };
const save = (c: Client, items: Json[], extra: { p_meal_id?: string; p_expected_revision?: number } = {}) =>
  c.rpc("save_meal", { p_request_id: randomUUID(), p_meal: meal, p_items: items, ...extra });
const totalKcal = async (c: Client, mealId: string) =>
  (await c.from("meal_items").select("total_kcal, position").eq("meal_id", mealId).order("position")).data;

let a: { id: string; client: Client };
let b: { id: string; client: Client };

beforeAll(async () => { [a, b] = await Promise.all([newUser("ra"), newUser("rb")]); });

describe("quy đổi đơn vị trong save_meal", () => {
  it.each([
    ["serving → cơ sở 100 g (khẩu phần 60 g)", { basis_type: "per_100g", basis_quantity: 100, basis_unit: "g", serving_mass_g: 60, consumed_quantity: 1, consumed_unit: "serving" }, 60],
    ["g → cơ sở khẩu phần 50 g", { basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", serving_mass_g: 50, consumed_quantity: 100, consumed_unit: "g" }, 200],
    ["serving → cơ sở 100 ml (khẩu phần 250 ml)", { basis_type: "per_100ml", basis_quantity: 100, basis_unit: "ml", serving_volume_ml: 250, consumed_quantity: 1, consumed_unit: "serving" }, 250],
    ["0,5 gói", { basis_type: "per_package", basis_quantity: 1, basis_unit: "package", consumed_quantity: 0.5, consumed_unit: "package" }, 50],
  ])("%s", async (_, item, expected) => {
    const res = await save(a.client, [{ ...base, ...item }]);
    expect(res.error).toBeNull();
    expect((await totalKcal(a.client, (res.data as { meal_id: string }).meal_id))?.[0].total_kcal).toBe(expected);
  });

  it("gói và khẩu phần không tự quy đổi cho nhau", async () => {
    const res = await save(a.client, [{ ...base, basis_type: "per_package", basis_quantity: 1, basis_unit: "package", consumed_quantity: 1, consumed_unit: "serving" }]);
    expect(res.error?.message).toContain("incompatible_units");
  });

  it("snapshot có cơ sở mâu thuẫn bị từ chối", async () => {
    const res = await save(a.client, [{ ...base, basis_type: "per_100g", basis_quantity: 1, basis_unit: "serving", consumed_quantity: 3, consumed_unit: "serving" }]);
    expect(res.error).not.toBeNull();
  });
});

describe("ngày hợp lệ", () => {
  it("từ chối ngày vô hạn hoặc ngoài khoảng", async () => {
    const ok = { ...base, basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", consumed_quantity: 1, consumed_unit: "serving" };
    expect((await a.client.rpc("save_meal", { p_request_id: randomUUID(), p_meal: { ...meal, meal_date: "infinity" }, p_items: [ok] })).error).not.toBeNull();
    expect((await a.client.from("weight_logs").insert({ logged_date: "-infinity", weight_kg: 70 })).error).not.toBeNull();
    expect((await a.client.from("goals").insert({ goal_type: "maintain", daily_kcal: 2000, protein_g: 100, carbs_g: 250, fat_g: 60, effective_from: "1900-01-01" })).error).not.toBeNull();
  });

  it("mục tiêu của ngày D là bản có effective_from lớn nhất không vượt D", async () => {
    const goal = (effective_from: string, daily_kcal: number) => ({ goal_type: "maintain", daily_kcal, protein_g: 100, carbs_g: 250, fat_g: 60, effective_from });
    expect((await b.client.from("goals").insert([goal("2026-01-01", 1800), goal("2026-06-01", 2000), goal("2099-01-01", 2500)])).error).toBeNull();
    // Cùng truy vấn với src/features/goals/queries.ts.
    const goalOn = async (day: string) => (await b.client.from("goals").select("daily_kcal").lte("effective_from", day)
      .order("effective_from", { ascending: false }).limit(1).maybeSingle()).data?.daily_kcal ?? null;
    expect(await goalOn("2025-12-31")).toBeNull();
    expect(await goalOn("2026-03-01")).toBe(1800);
    expect(await goalOn("2026-06-01")).toBe(2000);
    expect(await goalOn("2026-11-22")).toBe(2000);
  });

  it("múi giờ chỉ nhận tên IANA", async () => {
    for (const tz of ["+07", "ICT", "Sao/Hoa"]) {
      expect((await a.client.from("profiles").update({ timezone: tz }).eq("id", a.id)).error, tz).not.toBeNull();
    }
    for (const tz of ["Asia/Bangkok", "UTC", "Asia/Ho_Chi_Minh"]) {
      expect((await a.client.from("profiles").update({ timezone: tz }).eq("id", a.id)).error, tz).toBeNull();
    }
  });
});

describe("quyền ghi trực tiếp", () => {
  it("client không đọc hoặc ghi mutation_requests", async () => {
    expect((await a.client.from("mutation_requests").select("request_id")).error).not.toBeNull();
    expect((await a.client.from("mutation_requests").insert({ user_id: a.id, request_id: randomUUID(), operation: "create_meal", payload_hash: "x" })).error).not.toBeNull();
  });

  it("client không ghi trực tiếp meal_items", async () => {
    const created = await save(a.client, [{ ...base, basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", consumed_quantity: 1, consumed_unit: "serving" }]);
    const mealId = (created.data as { meal_id: string }).meal_id;
    const insert = await a.client.from("meal_items").insert({
      meal_id: mealId, position: 5, name_snapshot: "Chèn", basis_type_snapshot: "per_serving", basis_quantity_snapshot: 1, basis_unit_snapshot: "serving",
      consumed_quantity: 1, consumed_unit: "serving", base_kcal_snapshot: 1, base_protein_g_snapshot: 0, base_carbs_g_snapshot: 0, base_fat_g_snapshot: 0,
      total_kcal: 1, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, source_snapshot: "manual",
    });
    expect(insert.error).not.toBeNull();
    await a.client.from("meal_items").update({ total_kcal: 9999 }).eq("meal_id", mealId);
    await a.client.from("meal_items").delete().eq("meal_id", mealId);
    expect(await totalKcal(a.client, mealId)).toEqual([{ total_kcal: 100, position: 0 }]);
  });

  it("user B không sửa/xóa goals, profiles, weight_logs của A; không đổi user_id sang người khác", async () => {
    await a.client.from("weight_logs").insert({ logged_date: "2026-11-02", weight_kg: 72 });
    await a.client.from("goals").insert({ goal_type: "lose", daily_kcal: 1900, protein_g: 120, carbs_g: 200, fat_g: 60, effective_from: "2026-11-02" });
    await b.client.from("weight_logs").update({ weight_kg: 1 }).eq("user_id", a.id);
    await b.client.from("weight_logs").delete().eq("user_id", a.id);
    await b.client.from("goals").update({ daily_kcal: 1 }).eq("user_id", a.id);
    await b.client.from("goals").delete().eq("user_id", a.id);
    await b.client.from("profiles").update({ display_name: "Bị sửa" }).eq("id", a.id);
    expect((await a.client.from("weight_logs").select("weight_kg").eq("logged_date", "2026-11-02").single()).data?.weight_kg).toBe(72);
    expect((await a.client.from("goals").select("daily_kcal").eq("effective_from", "2026-11-02").single()).data?.daily_kcal).toBe(1900);
    expect((await a.client.from("profiles").select("display_name").single()).data?.display_name).toBeNull();
    const move = await a.client.from("weight_logs").update({ user_id: b.id }).eq("logged_date", "2026-11-02");
    expect(move.error).not.toBeNull();
  });
});

describe("sửa bữa", () => {
  const serving = (kcal: number) => ({ ...base, kcal, basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", consumed_quantity: 1, consumed_unit: "serving" });

  it("sửa thay toàn bộ item và đánh lại vị trí", async () => {
    const created = await save(a.client, [serving(100), serving(200), serving(300)]);
    const mealId = (created.data as { meal_id: string }).meal_id;
    const updated = await save(a.client, [serving(250)], { p_meal_id: mealId, p_expected_revision: 1 });
    expect(updated.data).toEqual({ meal_id: mealId, revision: 2 });
    expect(await totalKcal(a.client, mealId)).toEqual([{ total_kcal: 250, position: 0 }]);
  });

  it("hai bản sửa đồng thời cùng revision: một thành công, một báo xung đột", async () => {
    const created = await save(a.client, [serving(100)]);
    const mealId = (created.data as { meal_id: string }).meal_id;
    const [x, y] = await Promise.all([
      save(a.client, [serving(111)], { p_meal_id: mealId, p_expected_revision: 1 }),
      save(a.client, [serving(222)], { p_meal_id: mealId, p_expected_revision: 1 }),
    ]);
    const errors = [x.error, y.error].filter(Boolean);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("revision_conflict");
    expect((await totalKcal(a.client, mealId))?.[0].total_kcal).toBe(x.error ? 222 : 111);
  });
});

describe("đăng ký", () => {
  it("mật khẩu dưới 8 ký tự bị Supabase từ chối", async () => {
    const anon = createClient<Database>(url, anonKey, options);
    const res = await anon.auth.signUp({ email: `short-${randomUUID()}@example.test`, password: "1234567" });
    expect(res.error).not.toBeNull();
  });
});

describe("consume_ai_quota", () => {
  it("đếm theo người dùng, chặn khi hết lượt và không tăng thêm", async () => {
    const user = await newUser("quota");
    expect((await user.client.rpc("consume_ai_quota", { p_daily_limit: 2 })).data).toBe(1);
    expect((await user.client.rpc("consume_ai_quota", { p_daily_limit: 2 })).data).toBe(0);
    const over = await user.client.rpc("consume_ai_quota", { p_daily_limit: 2 });
    expect(over.error?.message).toContain("ai_quota_exceeded");
    expect((await b.client.rpc("consume_ai_quota", { p_daily_limit: 2 })).error).toBeNull();
    expect((await user.client.from("ai_usage").select("request_count")).error).not.toBeNull();
  });

  it("khách chưa đăng nhập không gọi được", async () => {
    const anon = createClient<Database>(url, anonKey, options);
    expect((await anon.rpc("consume_ai_quota", { p_daily_limit: 5 })).error).not.toBeNull();
  });
});
