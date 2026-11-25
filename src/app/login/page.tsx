import { LoginForm } from "@/features/auth/login-form";
import { signupEnabled } from "@/lib/signup";

export const metadata = { title: "Đăng nhập" };
// Đọc SIGNUP_ENABLED lúc chạy (không đóng băng lúc build).
export const dynamic = "force-dynamic";
export default function Page() { return <LoginForm signupEnabled={signupEnabled()} />; }
