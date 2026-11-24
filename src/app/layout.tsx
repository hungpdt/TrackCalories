import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Tổng quan | tcgm", template: "%s | tcgm" }, description: "Theo dõi bữa ăn, calories, cân nặng và mục tiêu của bạn." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning chỉ áp cho thuộc tính của chính <html>/<body> (một cấp): tiện ích trình duyệt
  // (Grammarly, tiện ích thêm class="mdl-js"…) chèn thuộc tính trước khi React hydrate. Không che lỗi của component con.
  return <html lang="vi" suppressHydrationWarning><body suppressHydrationWarning>{children}</body></html>;
}
