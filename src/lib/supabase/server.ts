import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/** Client Supabase cho mỗi request phía server (Server Component, Server Action, Route Handler). */
export async function createSupabaseServerClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: items => {
        try {
          for (const { name, value, options } of items) cookieStore.set(name, value, options);
        } catch {
          // Server Component không được ghi cookie; proxy.ts đã làm mới session trước khi render.
        }
      },
    },
  });
}

/**
 * Người dùng đã xác thực (JWT được kiểm tra qua getClaims). Không có thì chuyển tới /login.
 * Dùng ở mọi trang/action cần dữ liệu cá nhân; RLS ở database vẫn là lớp chặn cuối.
 */
export const requireUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return { supabase, userId: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
