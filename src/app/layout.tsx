import type { Metadata } from "next";
import { DemoProvider } from "@/components/demo-provider";
import { AppShell } from "@/components/navigation/app-shell";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Tổng quan | tcgm", template: "%s | tcgm" }, description: "Theo dõi bữa ăn, calories và hành trình của bạn. Bản xem trước với dữ liệu minh họa." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><DemoProvider><AppShell>{children}</AppShell></DemoProvider></body></html>;
}
