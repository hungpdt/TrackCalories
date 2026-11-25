// Sao lưu / khôi phục dữ liệu của MỘT tài khoản qua Supabase client đã đăng nhập bằng chính tài khoản đó.
// Mọi truy vấn đi qua RLS: không cần và không dùng service-role key.
// Dùng chung cho scripts/backup.mjs, scripts/restore.mjs và tests/db/backup.test.ts.

export const BACKUP_VERSION = 1;
export const PHOTO_BUCKET = "meal-photos";
const TABLES = ["profiles", "goals", "foods", "weight_logs", "meals", "meal_items"];
const PAGE = 1000;

async function readAll(client, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select("*").order("created_at").order("id").range(from, from + PAGE - 1);
    if (error) throw new Error(`Không đọc được bảng ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/**
 * Xuất toàn bộ dữ liệu của tài khoản đang đăng nhập.
 * @returns {{ data: object, photos: Map<string, Uint8Array>, missingPhotos: string[] }} photos theo meal id.
 */
export async function exportAccount(client) {
  const { data: claims, error } = await client.auth.getClaims();
  if (error || !claims?.claims?.sub) throw new Error("Chưa đăng nhập.");
  const tables = {};
  for (const table of TABLES) tables[table] = await readAll(client, table);

  const photos = new Map();
  const missingPhotos = [];
  for (const meal of tables.meals) {
    if (!meal.photo_path) continue;
    const { data: blob, error: downloadError } = await client.storage.from(PHOTO_BUCKET).download(meal.photo_path);
    if (downloadError || !blob) { missingPhotos.push(meal.id); continue; }
    photos.set(meal.id, new Uint8Array(await blob.arrayBuffer()));
  }
  return {
    data: { version: BACKUP_VERSION, exported_at: new Date().toISOString(), user_id: claims.claims.sub, tables },
    photos,
    missingPhotos,
  };
}

const omit = (row, keys) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
const num = value => (value === null || value === undefined ? null : Number(value));

/** Chuyển một meal_item đã lưu thành item đầu vào của RPC save_meal (giữ nguyên snapshot và tổng). */
export function itemPayload(item) {
  return {
    food_id: item.food_id,
    name: item.name_snapshot,
    basis_type: item.basis_type_snapshot,
    basis_quantity: num(item.basis_quantity_snapshot),
    basis_unit: item.basis_unit_snapshot,
    serving_label: item.serving_label_snapshot,
    serving_mass_g: num(item.serving_mass_g_snapshot),
    serving_volume_ml: num(item.serving_volume_ml_snapshot),
    consumed_quantity: num(item.consumed_quantity),
    consumed_unit: item.consumed_unit,
    kcal: num(item.base_kcal_snapshot),
    protein_g: num(item.base_protein_g_snapshot),
    carbs_g: num(item.base_carbs_g_snapshot),
    fat_g: num(item.base_fat_g_snapshot),
    source: item.source_snapshot,
    assumptions: item.assumptions_snapshot ?? [],
    // Giữ đúng tổng cũ: gửi kèm tổng và đánh dấu override (save_meal dùng tổng này thay vì tính lại).
    manual_override: true,
    total_kcal: num(item.total_kcal),
    total_protein_g: num(item.total_protein_g),
    total_carbs_g: num(item.total_carbs_g),
    total_fat_g: num(item.total_fat_g),
  };
}

async function isEmpty(client) {
  for (const table of ["goals", "foods", "weight_logs", "meals"]) {
    const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
    if (error) throw new Error(`Không kiểm tra được bảng ${table}: ${error.message}`);
    if (count) return false;
  }
  return true;
}

/**
 * Nhập bản sao lưu vào tài khoản đang đăng nhập. Chỉ chạy khi tài khoản chưa có mục tiêu/món/cân nặng/bữa ăn
 * (tránh trộn hoặc nhân đôi dữ liệu). Mọi bản ghi nhận id mới; ảnh được tải lên theo id bữa mới.
 * @param readPhoto (oldMealId) => Promise<Uint8Array | null>
 * @param newRequestId () => string  uuid cho mỗi lần gọi save_meal
 */
export async function importAccount(client, data, readPhoto, newRequestId) {
  if (data?.version !== BACKUP_VERSION || !data.tables) throw new Error("File sao lưu không đúng định dạng.");
  const { data: claims } = await client.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) throw new Error("Chưa đăng nhập.");
  if (!(await isEmpty(client))) throw new Error("Tài khoản này đã có dữ liệu. Chỉ khôi phục vào tài khoản trống.");

  const t = data.tables;
  const summary = { profile: false, goals: 0, foods: 0, weight_logs: 0, meals: 0, photos: 0, photoErrors: 0 };

  const profile = t.profiles?.[0];
  if (profile) {
    const { error } = await client.from("profiles").update(omit(profile, ["id", "created_at", "updated_at"])).eq("id", uid);
    if (error) throw new Error(`Không khôi phục được hồ sơ: ${error.message}`);
    summary.profile = true;
  }

  // Bản ghi nhận id mới (không đụng id cũ, kể cả khi khôi phục vào cùng database); món kho đổi id thì map lại food_id của các món đã ăn.
  const foodIds = new Map();
  for (const table of ["foods", "goals", "weight_logs"]) {
    const rows = (t[table] ?? []).map(row => {
      const id = globalThis.crypto.randomUUID();
      if (table === "foods") foodIds.set(row.id, id);
      return { ...omit(row, ["id", "user_id"]), id };
    });
    for (let index = 0; index < rows.length; index += 500) {
      const { error } = await client.from(table).insert(rows.slice(index, index + 500));
      if (error) throw new Error(`Không khôi phục được bảng ${table}: ${error.message}`);
    }
    summary[table] = rows.length;
  }

  const itemsByMeal = new Map();
  for (const item of t.meal_items ?? []) {
    if (!itemsByMeal.has(item.meal_id)) itemsByMeal.set(item.meal_id, []);
    itemsByMeal.get(item.meal_id).push(item);
  }
  for (const meal of t.meals ?? []) {
    const items = (itemsByMeal.get(meal.id) ?? []).sort((a, b) => a.position - b.position);
    if (!items.length) continue;
    const { data: saved, error } = await client.rpc("save_meal", {
      p_request_id: newRequestId(),
      p_meal: { meal_date: meal.meal_date, eaten_at: meal.eaten_at, meal_type: meal.meal_type, note: meal.note ?? "" },
      p_items: items.map(item => ({ ...itemPayload(item), food_id: item.food_id ? foodIds.get(item.food_id) ?? null : null })),
    });
    if (error) throw new Error(`Không khôi phục được bữa ${meal.meal_date}: ${error.message}`);
    summary.meals += 1;

    if (!meal.photo_path) continue;
    const bytes = await readPhoto(meal.id);
    if (!bytes) { summary.photoErrors += 1; continue; }
    const path = `${uid}/${saved.meal_id}.jpg`;
    const upload = await client.storage.from(PHOTO_BUCKET).upload(path, new Blob([bytes], { type: "image/jpeg" }), { contentType: "image/jpeg", upsert: true });
    const update = upload.error ? upload : await client.from("meals").update({ photo_path: path }).eq("id", saved.meal_id);
    if (update.error) summary.photoErrors += 1; else summary.photos += 1;
  }
  return summary;
}
