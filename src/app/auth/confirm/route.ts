import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Liên kết xác nhận email (khi bật enable_confirmations trên Supabase cloud).
// Mẫu email cần trỏ tới: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
const allowed: EmailOtpType[] = ["email", "signup", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const target = request.nextUrl.clone();
  target.search = "";
  if (tokenHash && type && allowed.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      target.pathname = "/";
      return NextResponse.redirect(target);
    }
  }
  // Chỉ chuyển về đường dẫn nội bộ cố định, không nhận tham số chuyển hướng từ URL.
  target.pathname = "/login";
  return NextResponse.redirect(target);
}
