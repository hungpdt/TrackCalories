"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, LayoutDashboard, BookOpen, CalendarDays, Scale, Settings2, Plus, Sprout, FlaskConical } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AddMealSheet } from "./add-meal-sheet";
// Khóa localStorage của hồ sơ G1; hồ sơ nay lưu theo tài khoản nên xóa bản cũ khỏi thiết bị.
const legacyProfileKey = "tcgm.nutrition-profile.v1";
const links = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/history", label: "Nhật ký", icon: CalendarDays },
  { href: "/foods", label: "Kho món ăn", short: "Kho món", icon: BookOpen },
  { href: "/weight", label: "Cân nặng", icon: Scale },
  { href: "/settings", label: "Cài đặt", icon: Settings2 },
];
export function AppShell({ children, email }: { children: ReactNode; email: string | null }) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const searchParams = useSearchParams();
  // Ngày đang xem ở Tổng quan/Nhật ký; bảng "+" ghi món cho đúng ngày này.
  const viewedDate = (pathname === "/" || pathname === "/history") && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("date") ?? "") ? searchParams.get("date") : null;
  useEffect(() => { try { localStorage.removeItem(legacyProfileKey); } catch { /* trình duyệt chặn storage */ } }, []);
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-icon"><Sprout size={24} /></span><span>tcgm<span className="brand-caption">CALORIES TRACKER</span></span></Link>
      <p className="nav-label">KHÔNG GIAN CỦA BẠN</p>
      <nav aria-label="Điều hướng chính">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-item ${pathname === href ? "active" : ""}`} aria-current={pathname === href ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>)}</nav>
      <Link className="button sidebar-add" href="/add-meal"><Plus size={20} /> Ghi bữa ăn</Link>
      <div className="sidebar-bottom"><Activity size={24} /><p>Từng bữa ăn nhỏ.<br /><strong>Một hành trình của bạn.</strong></p><span className="small">Theo dõi • Thấu hiểu • Tiến bộ</span></div>
      <Link href="/settings" className="profile"><span className="avatar" aria-hidden="true">{(email ?? "?").charAt(0).toUpperCase()}</span><div><strong>Tài khoản</strong><span className="profile-email">{email ?? "Đã đăng nhập"}</span></div></Link>
    </aside>
    <div className="workspace">
      <header className="topbar"><Link href="/" className="mobile-brand"><Sprout size={22} /> tcgm</Link><span className="topbar-title">Ăn uống có ý thức, mỗi ngày</span><span className="topbar-end"><span className="demo-pill"><FlaskConical size={15} /> Bản xem trước</span><Link href="/settings" className="mobile-settings" aria-label="Cài đặt" aria-current={pathname === "/settings" ? "page" : undefined}><Settings2 size={20} /></Link></span></header>
      <main id="main-content" tabIndex={-1}>{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="Điều hướng điện thoại">{links.slice(0, 2).map(({ href, label, short, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={21} /><span>{short ?? label}</span></Link>)}<button type="button" className="mobile-add" aria-label="Ghi bữa ăn" aria-haspopup="dialog" aria-expanded={addOpen} onClick={() => setAddOpen(true)}><Plus size={25} /></button>{links.slice(2, 4).map(({ href, label, short, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={21} /><span>{short ?? label}</span></Link>)}</nav>
    <AddMealSheet open={addOpen} onClose={() => setAddOpen(false)} date={viewedDate} />
  </div>;
}
