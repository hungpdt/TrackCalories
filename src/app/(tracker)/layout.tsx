import { AppShell } from "@/components/navigation/app-shell";
import { getStreak } from "@/features/meals/queries";
import { requireUser } from "@/lib/supabase/server";

// Mọi trang theo dõi yêu cầu đăng nhập; kiểm tra lại ở server dù proxy đã chuyển hướng.
export default async function TrackerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { email } = await requireUser();
  return <AppShell email={email} streak={await getStreak()}>{children}</AppShell>;
}
