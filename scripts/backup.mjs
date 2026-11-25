// Sao lưu dữ liệu của tài khoản: npm run backup [-- --env .env.production.local] [--out backups]
// Ghi backups/<ngày-giờ>/data.json và photos/<meal_id>.jpg. Thư mục backups/ không đưa lên Git (dữ liệu sức khỏe).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { exportAccount } from "./backup-lib.mjs";
import { option, run, signIn } from "./account-cli.mjs";

run(async () => {
  const client = await signIn();
  const { data, photos, missingPhotos } = await exportAccount(client);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const dir = path.resolve(option("out", "backups"), stamp);
  mkdirSync(path.join(dir, "photos"), { recursive: true });
  writeFileSync(path.join(dir, "data.json"), JSON.stringify(data, null, 2));
  for (const [mealId, bytes] of photos) writeFileSync(path.join(dir, "photos", `${mealId}.jpg`), bytes);
  const t = data.tables;
  console.log(`Đã sao lưu vào ${dir}`);
  console.log(`  ${t.meals.length} bữa (${t.meal_items.length} món), ${t.foods.length} món trong kho, ${t.weight_logs.length} lần cân, ${t.goals.length} mục tiêu, ${photos.size} ảnh.`);
  if (missingPhotos.length) console.log(`  Không tải được ${missingPhotos.length} ảnh (bữa vẫn được sao lưu).`);
  console.log("Cất thư mục này ở nơi an toàn (ví dụ Google Drive). Không đưa lên GitHub.");
});
