"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signupEnabled } from "@/lib/signup";

export type AuthState = { error?: string; email?: string };

const credentials = z.object({
  email: z.email("Nhập email hợp lệ.").max(254),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(72, "Mật khẩu tối đa 72 ký tự."),
});

function read(formData: FormData) {
  return credentials.safeParse({ email: String(formData.get("email") ?? "").trim(), password: String(formData.get("password") ?? "") });
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = read(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Không nói rõ sai email hay mật khẩu để tránh dò tài khoản.
  if (error) return { error: "Email hoặc mật khẩu chưa đúng.", email };
  redirect("/");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = read(formData);
  const email = String(formData.get("email") ?? "");
  if (!signupEnabled()) return { error: "Ứng dụng đang tắt đăng ký tài khoản mới.", email };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) return { error: error.code === "user_already_exists" ? "Email này đã có tài khoản. Hãy đăng nhập." : "Chưa tạo được tài khoản. Thử lại sau.", email };
  if (!data.session) return { error: "Đã tạo tài khoản. Kiểm tra email để xác nhận rồi đăng nhập.", email };
  redirect("/");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
