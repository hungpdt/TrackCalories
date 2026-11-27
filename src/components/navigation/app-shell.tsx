"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, Home, BookOpen, ChartLine, UserRound, Plus, Sprout, Flame } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AddMealSheet } from "./add-meal-sheet";
import { AiJobsProvider } from "@/features/quick-log/ai-jobs";
// Khóa localStorage của hồ sơ G1; hồ sơ nay lưu theo tài khoản nên xóa bản cũ khỏi thiết bị.
const legacyProfileKey = "tcgm.nutrition-profile.v1";
// Ba tab chính (điện thoại); Kho món chỉ hiện ở thanh bên máy tính, trên điện thoại vào qua nút +.
const links = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/weight", label: "Tiến độ", icon: ChartLine },
  { href: "/settings", label: "Hồ sơ", icon: UserRound },
];
// prefetch: tải sẵn toàn bộ trang các tab chính (kể cả dữ liệu) để lần đầu bấm cũng hiện ngay;
// bản tải sẵn giữ theo staleTimes.static trong next.config.ts, server action ghi dữ liệu sẽ xóa nó.
const desktopLinks = [links[0], { href: "/foods", label: "Kho món ăn", icon: BookOpen }, links[1], links[2]];
export function AppShell({ children, email, streak }: { children: ReactNode; email: string | null; streak: { days: number; today: boolean } }) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const searchParams = useSearchParams();
  // Ngày đang xem ở Tổng quan/Nhật ký; bảng "+" ghi món cho đúng ngày này.
  const viewedDate = pathname === "/" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("date") ?? "") ? searchParams.get("date") : null;
  useEffect(() => { try { localStorage.removeItem(legacyProfileKey); } catch { /* trình duyệt chặn storage */ } }, []);
  return <AiJobsProvider><div className="app-shell">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-icon"><Sprout size={24} /></span><span>tcgm<span className="brand-caption">CALORIES TRACKER</span></span></Link>
      <p className="nav-label">KHÔNG GIAN CỦA BẠN</p>
      <nav aria-label="Điều hướng chính">{desktopLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch className={`nav-item ${pathname === href ? "active" : ""}`} aria-current={pathname === href ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>)}</nav>
      <Link className="button sidebar-add" href="/add-meal"><Plus size={20} /> Ghi bữa ăn</Link>
      <div className="sidebar-bottom"><Activity size={24} /><p>Từng bữa ăn nhỏ.<br /><strong>Một hành trình của bạn.</strong></p><span className="small">Theo dõi • Thấu hiểu • Tiến bộ</span></div>
      <Link href="/settings" className="profile"><span className="avatar" aria-hidden="true">{(email ?? "?").charAt(0).toUpperCase()}</span><div><strong>Tài khoản</strong><span className="profile-email">{email ?? "Đã đăng nhập"}</span></div></Link>
    </aside>
    <div className="workspace">
      <header className="topbar"><Link href="/" className="mobile-brand"><Sprout size={22} /> tcgm</Link><span className="topbar-title">Ăn uống có ý thức, mỗi ngày</span><span className="topbar-end"><Link href="/weight#chuoi-ngay" className={`streak-pill${streak.today ? " lit" : ""}`} aria-label={`Chuỗi ${streak.days} ngày ghi bữa liên tiếp${streak.today ? "" : ", hôm nay chưa ghi"}`}><Flame size={18} aria-hidden="true" /><span>{streak.days}</span></Link></span></header>
      <main id="main-content" tabIndex={-1}>{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="Điều hướng điện thoại">
      <div className="mobile-tabs">{links.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === "/" || pathname.startsWith("/meals") : pathname.startsWith(href); return <Link key={href} href={href} prefetch aria-current={active ? "page" : undefined}><Icon size={21} /><span>{label}</span></Link>; })}</div>
      <button type="button" className="mobile-add" aria-label="Ghi bữa ăn" aria-haspopup="dialog" aria-expanded={addOpen} onClick={() => setAddOpen(true)}><Plus size={26} /></button>
    </nav>
    <AddMealSheet open={addOpen} onClose={() => setAddOpen(false)} date={viewedDate} />
  </div></AiJobsProvider>;
}
