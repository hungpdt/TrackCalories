import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

// Làm mới session Supabase mỗi lần điều hướng và chuyển khách chưa đăng nhập tới /login.
// Đây là kiểm tra lạc quan; trang và action vẫn gọi requireUser(), database có RLS.
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
        for (const [header, value] of Object.entries(headers ?? {})) response.headers.set(header, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth/");

  const redirectTo = (pathname: string) => {
    const target = request.nextUrl.clone();
    target.pathname = pathname;
    target.search = "";
    const redirect = NextResponse.redirect(target);
    // Giữ cookie session vừa được làm mới, nếu không trình duyệt vẫn giữ token cũ.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };
  // API tự trả 401 JSON; chỉ chuyển hướng trang.
  if (!signedIn && !isAuthPage && !pathname.startsWith("/api/")) return redirectTo("/login");
  // /auth/confirm phải chạy cả khi đã đăng nhập (đổi email, khôi phục mật khẩu).
  if (signedIn && isAuthPage && !pathname.startsWith("/auth/confirm")) return redirectTo("/");
  return response;
}

export const config = {
  // Bỏ qua file tĩnh và tài nguyên build.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
