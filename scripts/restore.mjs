// Khôi phục bản sao lưu vào một tài khoản CHƯA có dữ liệu: npm run restore -- backups/<thư-mục> [--env .env.production.local]
// Dùng để chuyển dữ liệu từ máy lên cloud hoặc dựng lại sau sự cố. Không ghi đè/trộn vào tài khoản đã có bữa ăn.
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { importAccount } from "./backup-lib.mjs";
import { run, signIn } from "./account-cli.mjs";

run(async () => {
  const dir = process.argv.slice(2).find(arg => !arg.startsWith("--") && existsSync(path.join(arg, "data.json")));
  if (!dir) throw new Error("Chỉ định thư mục sao lưu có data.json, ví dụ: npm run restore -- backups/2026-11-25-21-00");
  const data = JSON.parse(readFileSync(path.join(dir, "data.json"), "utf8"));
  const client = await signIn();
  const readPhoto = async mealId => {
    const file = path.join(dir, "photos", `${mealId}.jpg`);
    return existsSync(file) ? new Uint8Array(readFileSync(file)) : null;
  };
  const summary = await importAccount(client, data, readPhoto, randomUUID);
  console.log(`Đã khôi phục: hồ sơ ${summary.profile ? "có" : "không"}, ${summary.goals} mục tiêu, ${summary.foods} món kho, ${summary.weight_logs} lần cân, ${summary.meals} bữa, ${summary.photos} ảnh.`);
  if (summary.photoErrors) console.log(`  ${summary.photoErrors} ảnh không khôi phục được (bữa vẫn có).`);
});
