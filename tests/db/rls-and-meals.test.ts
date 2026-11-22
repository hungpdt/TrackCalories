import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, inject, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

// Mọi số liệu dưới đây là dữ liệu giả lập cho kiểm thử, không phải dữ liệu sức khỏe thật.
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

const milk = (patch: Record<string, unknown> = {}) => ({
  name: "Sữa giả lập", basis_type: "per_100ml", basis_quantity: 100, basis_unit: "ml",
  consumed_quantity: 250, consumed_unit: "ml", kcal: 60, protein_g: 5, carbs_g: 2.7, fat_g: 3.2, source: "manual", ...patch,
});
const meal = { meal_date: "2026-11-22", meal_type: "breakfast" };

let a: { id: string; client: Client };
let b: { id: string; client: Client };
let foodA: string;

beforeAll(async () => {
  [a, b] = await Promise.all([newUser("a"), newUser("b")]);
  const food = await a.client.from("foods").insert({
    name: "Phở bò giả lập", basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", serving_label: "1 tô",
    kcal: 450, protein_g: 28, carbs_g: 58, fat_g: 12, source: "manual",
  }).select("id").single();
  if (food.error) throw food.error;
  foodA = food.data.id;
});

describe("hồ sơ và quyền truy cập", () => {
  it("tạo hồ sơ khi đăng ký và chỉ đọc được hồ sơ của mình", async () => {
    const own = await a.client.from("profiles").select("id, timezone");
    expect(own.error).toBeNull();
    expect(own.data).toEqual([{ id: a.id, timezone: "Asia/Ho_Chi_Minh" }]);
    const other = await a.client.from("profiles").select("id").eq("id", b.id);
    expect(other.data).toEqual([]);
  });

  it("khách chưa đăng nhập không đọc được dữ liệu", async () => {
    const anon = createClient<Database>(url, anonKey, options);
    const res = await anon.from("foods").select("id");
    expect(res.data ?? []).toEqual([]);
    const rpc = await anon.rpc("save_meal", { p_request_id: randomUUID(), p_meal: meal, p_items: [milk()] });
    expect(rpc.error).not.toBeNull();
  });

  it("user B không đọc, sửa, xóa food của A", async () => {
    expect((await b.client.from("foods").select("id").eq("id", foodA)).data).toEqual([]);
    await b.client.from("foods").update({ name: "Đã bị sửa" }).eq("id", foodA);
    await b.client.from("foods").delete().eq("id", foodA);
    const still = await a.client.from("foods").select("name").eq("id", foodA).single();
    expect(still.data?.name).toBe("Phở bò giả lập");
  });

  it("không tạo được bản ghi mang owner của người khác", async () => {
    const res = await b.client.from("foods").insert({
      user_id: a.id, name: "Giả mạo", basis_type: "per_100g", basis_quantity: 100, basis_unit: "g",
      kcal: 1, protein_g: 0, carbs_g: 0, fat_g: 0, source: "manual",
    });
    expect(res.error).not.toBeNull();
    const weight = await b.client.from("weight_logs").insert({ user_id: a.id, logged_date: "2026-11-22", weight_kg: 70 });
    expect(weight.error).not.toBeNull();
  });

  it("client không ghi trực tiếp vào meals để bỏ qua RPC", async () => {
    const res = await a.client.from("meals").insert({ meal_date: "2026-11-22", meal_type: "lunch" });
    expect(res.error).not.toBeNull();
  });
});

describe("ràng buộc dữ liệu", () => {
  it("từ chối dinh dưỡng âm và cơ sở không khớp đơn vị", async () => {
    const negative = await a.client.from("foods").insert({
      name: "Âm", basis_type: "per_100g", basis_quantity: 100, basis_unit: "g", kcal: -1, protein_g: 0, carbs_g: 0, fat_g: 0, source: "manual",
    });
    expect(negative.error).not.toBeNull();
    const mismatch = await a.client.from("foods").insert({
      name: "Lệch", basis_type: "per_100ml", basis_quantity: 100, basis_unit: "g", kcal: 1, protein_g: 0, carbs_g: 0, fat_g: 0, source: "manual",
    });
    expect(mismatch.error).not.toBeNull();
  });

  it("một bản ghi cân nặng mỗi ngày", async () => {
    expect((await a.client.from("weight_logs").insert({ logged_date: "2026-11-01", weight_kg: 75.5 })).error).toBeNull();
    expect((await a.client.from("weight_logs").insert({ logged_date: "2026-11-01", weight_kg: 75.2 })).error?.code).toBe("23505");
  });

  it("múi giờ hồ sơ không hợp lệ bị từ chối", async () => {
    const res = await a.client.from("profiles").update({ timezone: "Sao/Hoả" }).eq("id", a.id);
    expect(res.error).not.toBeNull();
  });
});

describe("save_meal", () => {
  it("tính tổng từ cơ sở × hệ số: 100 ml → uống 250 ml", async () => {
    const res = await a.client.rpc("save_meal", { p_request_id: randomUUID(), p_meal: meal, p_items: [milk()] });
    expect(res.error).toBeNull();
    const { meal_id } = res.data as { meal_id: string };
    const items = await a.client.from("meal_items").select("total_kcal, total_protein_g, total_carbs_g, total_fat_g, manual_override").eq("meal_id", meal_id);
    expect(items.data).toEqual([{ total_kcal: 150, total_protein_g: 12.5, total_carbs_g: 6.75, total_fat_g: 8, manual_override: false }]);
  });

  it("retry cùng request_id không tạo bữa trùng; payload khác báo xung đột", async () => {
    const requestId = randomUUID();
    const first = await a.client.rpc("save_meal", { p_request_id: requestId, p_meal: meal, p_items: [milk()] });
    const again = await a.client.rpc("save_meal", { p_request_id: requestId, p_meal: meal, p_items: [milk()] });
    expect(again.data).toEqual(first.data);
    const count = await a.client.from("meals").select("id", { count: "exact", head: true }).eq("id", (first.data as { meal_id: string }).meal_id);
    expect(count.count).toBe(1);
    const changed = await a.client.rpc("save_meal", { p_request_id: requestId, p_meal: meal, p_items: [milk({ consumed_quantity: 300 })] });
    expect(changed.error?.message).toContain("idempotency_conflict");
  });

  it("hai request đồng thời cùng request_id chỉ tạo một bữa", async () => {
    const requestId = randomUUID();
    const [x, y] = await Promise.all([
      a.client.rpc("save_meal", { p_request_id: requestId, p_meal: { ...meal, meal_date: "2026-10-01" }, p_items: [milk()] }),
      a.client.rpc("save_meal", { p_request_id: requestId, p_meal: { ...meal, meal_date: "2026-10-01" }, p_items: [milk()] }),
    ]);
    expect(x.error).toBeNull();
    expect(y.data).toEqual(x.data);
    const meals = await a.client.from("meals").select("id").eq("meal_date", "2026-10-01");
    expect(meals.data).toHaveLength(1);
  });

  it("một item lỗi thì rollback toàn bộ, không có bữa lưu một nửa", async () => {
    const res = await a.client.rpc("save_meal", {
      p_request_id: randomUUID(), p_meal: { ...meal, meal_date: "2026-09-09" }, p_items: [milk(), milk({ kcal: -5 })],
    });
    expect(res.error).not.toBeNull();
    expect((await a.client.from("meals").select("id").eq("meal_date", "2026-09-09")).data).toEqual([]);
  });

  it("bữa phải có ít nhất một món", async () => {
    const res = await a.client.rpc("save_meal", { p_request_id: randomUUID(), p_meal: meal, p_items: [] });
    expect(res.error?.message).toContain("meal_requires_1_to_50_items");
  });

  it("không tự đổi ml ↔ g; ghi đè tổng được giữ nguyên", async () => {
    const bad = await a.client.rpc("save_meal", { p_request_id: randomUUID(), p_meal: meal, p_items: [milk({ consumed_unit: "g" })] });
    expect(bad.error?.message).toContain("incompatible_units");
    const override = await a.client.rpc("save_meal", {
      p_request_id: randomUUID(), p_meal: meal,
      p_items: [milk({ manual_override: true, total_kcal: 155, total_protein_g: 12, total_carbs_g: 7, total_fat_g: 8 })],
    });
    expect(override.error).toBeNull();
    const items = await a.client.from("meal_items").select("total_kcal, manual_override").eq("meal_id", (override.data as { meal_id: string }).meal_id);
    expect(items.data).toEqual([{ total_kcal: 155, manual_override: true }]);
  });

  it("sửa với revision cũ báo xung đột; revision đúng thì tăng revision", async () => {
    const created = await a.client.rpc("save_meal", { p_request_id: randomUUID(), p_meal: meal, p_items: [milk()] });
    const { meal_id } = created.data as { meal_id: string; revision: number };
    const ok = await a.client.rpc("save_meal", {
      p_request_id: randomUUID(), p_meal: { ...meal, meal_type: "lunch" }, p_items: [milk({ consumed_quantity: 100 })], p_meal_id: meal_id, p_expected_revision: 1,
    });
    expect(ok.data).toEqual({ meal_id, revision: 2 });
    const stale = await a.client.rpc("save_meal", {
      p_request_id: randomUUID(), p_meal: meal, p_items: [milk()], p_meal_id: meal_id, p_expected_revision: 1,
    });
    expect(stale.error?.message).toContain("revision_conflict");
  });

  it("user B không dùng được food hoặc meal của A", async () => {
    const withFood = await b.client.rpc("save_meal", {
      p_request_id: randomUUID(), p_meal: meal,
      p_items: [{ ...milk(), food_id: foodA, basis_type: "per_serving", basis_quantity: 1, basis_unit: "serving", consumed_unit: "serving", consumed_quantity: 1 }],
    });
    expect(withFood.error?.message).toContain("food_not_found");
    const created = await a.client.rpc("save_meal", { p_request_id: randomUUID(), p_meal: meal, p_items: [milk()] });
    const { meal_id } = created.data as { meal_id: string };
    const hijack = await b.client.rpc("save_meal", { p_request_id: randomUUID(), p_meal: meal, p_items: [milk()], p_meal_id: meal_id, p_expected_revision: 1 });
    expect(hijack.error?.message).toContain("meal_not_found");
    expect((await b.client.from("meal_items").select("id").eq("meal_id", meal_id)).data).toEqual([]);
    await b.client.from("meals").delete().eq("id", meal_id);
    expect((await a.client.from("meals").select("id").eq("id", meal_id)).data).toHaveLength(1);
  });

  it("xóa food không đổi snapshot trong nhật ký; xóa bữa xóa cả item", async () => {
    const food = await a.client.from("foods").insert({
      name: "Bánh giả lập", basis_type: "per_100g", basis_quantity: 100, basis_unit: "g", kcal: 400, protein_g: 8, carbs_g: 60, fat_g: 14, source: "manual",
    }).select("id").single();
    const saved = await a.client.rpc("save_meal", {
      p_request_id: randomUUID(), p_meal: meal,
      p_items: [{ name: "Bánh giả lập", food_id: food.data!.id, basis_type: "per_100g", basis_quantity: 100, basis_unit: "g", consumed_quantity: 50, consumed_unit: "g", kcal: 400, protein_g: 8, carbs_g: 60, fat_g: 14, source: "library" }],
    });
    const { meal_id } = saved.data as { meal_id: string };
    await a.client.from("foods").update({ name: "Đổi tên", kcal: 999 }).eq("id", food.data!.id);
    await a.client.from("foods").delete().eq("id", food.data!.id);
    const item = await a.client.from("meal_items").select("food_id, user_id, name_snapshot, total_kcal").eq("meal_id", meal_id).single();
    expect(item.data).toEqual({ food_id: null, user_id: a.id, name_snapshot: "Bánh giả lập", total_kcal: 200 });
    await a.client.from("meals").delete().eq("id", meal_id);
    expect((await a.client.from("meal_items").select("id").eq("meal_id", meal_id)).data).toEqual([]);
  });
});

describe("save_profile_goal", () => {
  it("lưu hồ sơ, mục tiêu theo ngày hiệu lực và cân nặng trong một lần", async () => {
    const res = await a.client.rpc("save_profile_goal", {
      p_profile: { height_cm: 175, age_years: 30, sex_for_formula: "male", body_fat_pct: "", activity_level: "moderate", weight_kg: 75.5 },
      p_goal: { goal_type: "lose", weekly_adjustment_kcal: -1750, daily_kcal: 2391, protein_g: 121, carbs_g: 328, fat_g: 66 },
    });
    expect(res.error).toBeNull();
    const again = await a.client.rpc("save_profile_goal", {
      p_profile: { height_cm: 175, age_years: 30, sex_for_formula: "male", body_fat_pct: "", activity_level: "moderate" },
      p_goal: { goal_type: "maintain", weekly_adjustment_kcal: 0, daily_kcal: 2641, protein_g: 106, carbs_g: 390, fat_g: 73 },
    });
    expect(again.error).toBeNull();
    const goals = await a.client.from("goals").select("goal_type, daily_kcal");
    expect(goals.data).toEqual([{ goal_type: "maintain", daily_kcal: 2641 }]);
    expect((await b.client.from("goals").select("id")).data).toEqual([]);
  });
});
