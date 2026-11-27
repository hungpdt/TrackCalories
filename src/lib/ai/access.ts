/**
 * Tài khoản được dùng AI (tốn tiền OpenAI). AI_ALLOWED_EMAILS: danh sách email cách nhau bằng dấu phẩy,
 * không phân biệt hoa thường. Để trống hoặc không đặt: mọi tài khoản đã đăng nhập đều dùng được (như trước).
 */
export function aiAllowedFor(email: string | null | undefined, list = process.env.AI_ALLOWED_EMAILS) {
  const allowed = (list ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return true;
  return Boolean(email) && allowed.includes(email!.trim().toLowerCase());
}
