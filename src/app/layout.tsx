import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Tổng quan | tcgm", template: "%s | tcgm" }, description: "Theo dõi bữa ăn, calories, cân nặng và mục tiêu của bạn." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
