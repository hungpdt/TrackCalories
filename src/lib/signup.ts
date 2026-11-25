import "server-only";

/**
 * Cho phép tạo tài khoản mới trong app. Mặc định bật (local/test); trên cloud đặt SIGNUP_ENABLED=false sau khi
 * đã tạo tài khoản của mình. Lớp chặn thật là tắt "Allow new users to sign up" trong Supabase Auth.
 */
export function signupEnabled() {
  return process.env.SIGNUP_ENABLED?.trim().toLowerCase() !== "false";
}
