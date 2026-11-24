import { NextResponse, type NextRequest } from "next/server";
import { AiError, analyzeMeal, isAiConfigured, type AiErrorCode, type MealImage } from "@/lib/ai/analyze";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_NOTE = 1000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const aiMessages: Record<AiErrorCode, [number, string]> = {
  not_configured: [503, "AI chưa được cấu hình hoặc key không hợp lệ. Bạn vẫn có thể nhập thủ công."],
  timeout: [504, "AI phản hồi quá lâu. Thử lại hoặc nhập thủ công; ảnh và ghi chú vẫn được giữ."],
  rate_limited: [429, "Dịch vụ AI đang giới hạn tốc độ. Thử lại sau ít phút."],
  billing: [402, "Tài khoản OpenAI đã hết hạn mức hoặc chưa bật thanh toán. Bạn vẫn có thể nhập thủ công."],
  bad_output: [502, "AI trả kết quả không hợp lệ. Thử lại hoặc nhập thủ công."],
  provider: [502, "Không kết nối được dịch vụ AI. Thử lại hoặc nhập thủ công."],
};

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

async function hasImageSignature(file: File) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => head[index] === byte);
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return jpeg || png || webp;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return fail(401, "Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.");

  let form: FormData;
  try { form = await request.formData(); } catch { return fail(400, "Dữ liệu gửi lên không hợp lệ."); }

  const rawNote = form.get("note");
  const note = typeof rawNote === "string" ? rawNote.trim() : "";
  if (Array.from(note).length > MAX_NOTE) return fail(400, `Ghi chú tối đa ${MAX_NOTE} ký tự.`);
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > MAX_IMAGES) return fail(400, `Tối đa ${MAX_IMAGES} ảnh mỗi lần.`);
  if (!note && files.length === 0) return fail(400, "Thêm ít nhất một ảnh hoặc ghi chú.");

  let total = 0;
  for (const file of files) {
    if (/hei[cf]/i.test(file.type)) return fail(415, "Ảnh HEIC chưa được hỗ trợ. Chọn ảnh JPEG hoặc PNG.");
    if (!IMAGE_TYPES.has(file.type)) return fail(415, "Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
    if (file.size > MAX_IMAGE_BYTES) return fail(413, "Mỗi ảnh tối đa 3 MB.");
    // Kiểm tra chữ ký file thật, không tin MIME do client khai báo (tránh tốn lượt cho file giả).
    if (!(await hasImageSignature(file))) return fail(415, "File không phải ảnh JPEG, PNG hoặc WebP hợp lệ.");
    total += file.size;
  }
  if (total > MAX_TOTAL_BYTES) return fail(413, "Tổng dung lượng ảnh quá lớn.");

  if (!isAiConfigured()) return fail(...aiMessages.not_configured);

  const limit = Number(process.env.AI_DAILY_LIMIT) || 30;
  const quota = await supabase.rpc("consume_ai_quota", { p_daily_limit: limit });
  if (quota.error) {
    return quota.error.message.includes("ai_quota_exceeded")
      ? fail(429, `Bạn đã dùng hết ${limit} lượt AI hôm nay. Có thể nhập thủ công.`)
      : fail(500, "Chưa kiểm tra được hạn mức AI. Thử lại.");
  }

  const images: MealImage[] = await Promise.all(files.map(async file => ({
    mime: file.type, base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
  })));

  try {
    const draft = await analyzeMeal({ images, note });
    return NextResponse.json({ draft, remaining: quota.data });
  } catch (error) {
    const code: AiErrorCode = error instanceof AiError ? error.code : "provider";
    // Chỉ log mã lỗi; không log ảnh, ghi chú hay dữ liệu sức khỏe.
    console.error("quick-log AI error:", code);
    return fail(...aiMessages[code]);
  }
}
