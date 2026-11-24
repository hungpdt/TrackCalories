import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Ảnh bữa ăn đi qua server của app (không đưa signed URL Supabase cho trình duyệt):
 * điện thoại trong LAN không tới được địa chỉ Supabase local 127.0.0.1, và URL ảnh không lộ ra ngoài phiên đăng nhập.
 * RLS (meals + storage.objects) quyết định ai đọc được.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new NextResponse(null, { status: 401 });
  const { data: meal } = await supabase.from("meals").select("photo_path").eq("id", id).maybeSingle();
  if (!meal?.photo_path) return new NextResponse(null, { status: 404 });
  const { data: file } = await supabase.storage.from("meal-photos").download(meal.photo_path);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
