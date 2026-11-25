// Phần dùng chung của `npm run backup` và `npm run restore`: đọc file env, hỏi email/mật khẩu, đăng nhập.
import { existsSync, readFileSync } from "node:fs";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

export function option(name, fallback) {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

/** Đọc NEXT_PUBLIC_SUPABASE_URL/ANON_KEY từ file env (mặc định .env.local; cloud: --env .env.production.local). */
export function supabaseConfig() {
  const file = option("env", ".env.local");
  if (!existsSync(file)) throw new Error(`Không thấy file ${file}.`);
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*?)"?\s*$/);
    if (match) env[match[1]] = match[2];
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error(`${file} thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY.`);
  return { url, key, file };
}

function ask(question, hidden = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = text => { if (text.includes(question)) process.stdout.write(text); };
  return new Promise(resolve => rl.question(question, answer => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(answer.trim()); }));
}

/** Đăng nhập bằng tài khoản của chính người dùng; mật khẩu chỉ nằm trong bộ nhớ, không ghi ra đâu. */
export async function signIn() {
  const { url, key, file } = supabaseConfig();
  console.log(`Supabase: ${new URL(url).host} (từ ${file})`);
  const email = await ask("Email: ");
  const password = await ask("Mật khẩu: ", true);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Đăng nhập không được: kiểm tra email/mật khẩu.");
  return client;
}

export async function run(main) {
  try { await main(); process.exit(0); } catch (error) { console.error(`Lỗi: ${error instanceof Error ? error.message : error}`); process.exit(1); }
}
