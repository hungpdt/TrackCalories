import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import type { TestProject } from "vitest/node";

// Đọc URL/key của Supabase local từ CLI; chỉ dùng cho môi trường local, không ghi ra file hay log.
export default function setup(project: TestProject) {
  let raw: string;
  try {
    raw = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error("Không đọc được Supabase local. Chạy `npx supabase start` trước khi chạy `npm run test:db`.");
  }
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (match) env[match[1]] = match[2];
  }
  const url = env.API_URL;
  const anonKey = env.PUBLISHABLE_KEY || env.ANON_KEY;
  const serviceKey = env.SECRET_KEY || env.SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) throw new Error("Thiếu API_URL hoặc key từ `supabase status`.");
  project.provide("supabase", { url, anonKey, serviceKey });

  // Dọn tài khoản giả do lần chạy này tạo (email *@example.test, tạo sau lúc bắt đầu), kể cả ảnh trong Storage.
  // Không đụng tài khoản thật của người dùng trong DB local.
  const startedAt = Date.now() - 1000;
  return async () => {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data.users.length) break;
      for (const user of data.users) {
        if (!user.email?.endsWith("@example.test") || Date.parse(user.created_at) < startedAt) continue;
        const { data: files } = await admin.storage.from("meal-photos").list(user.id);
        if (files?.length) await admin.storage.from("meal-photos").remove(files.map(file => `${user.id}/${file.name}`));
        await admin.auth.admin.deleteUser(user.id);
      }
      if (data.users.length < 200) break;
    }
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    supabase: { url: string; anonKey: string; serviceKey: string };
  }
}
