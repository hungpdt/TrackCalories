"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, BookOpen, CalendarDays, Scale, Settings2, Plus, Sprout, FlaskConical } from "lucide-react";
import type { ReactNode } from "react";
const links = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/history", label: "Nhật ký", icon: CalendarDays },
  { href: "/foods", label: "Kho món ăn", short: "Kho món", icon: BookOpen },
  { href: "/weight", label: "Cân nặng", icon: Scale },
  { href: "/settings", label: "Cài đặt", icon: Settings2 },
];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-icon"><Sprout size={24} /></span><span>tcgm<span className="brand-caption">CALORIES TRACKER</span></span></Link>
      <p className="nav-label">KHÔNG GIAN CỦA BẠN</p>
      <nav aria-label="Điều hướng chính">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-item ${pathname === href ? "active" : ""}`} aria-current={pathname === href ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>)}</nav>
      <Link className="button sidebar-add" href="/add-meal"><Plus size={20} /> Ghi bữa ăn</Link>
      <div className="sidebar-bottom"><Activity size={24} /><p>Từng bữa ăn nhỏ.<br /><strong>Một hành trình của bạn.</strong></p><span className="small">Theo dõi • Thấu hiểu • Tiến bộ</span></div>
      <div className="profile"><span className="avatar">M</span><div><strong>Tài khoản minh họa</strong><span>Chưa đăng nhập</span></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><Link href="/" className="mobile-brand"><Sprout size={22} /> tcgm</Link><span className="topbar-title">Ăn uống có ý thức, mỗi ngày</span><span className="topbar-end"><span className="demo-pill"><FlaskConical size={15} /> Bản xem trước</span><Link href="/settings" className="mobile-settings" aria-label="Cài đặt" aria-current={pathname === "/settings" ? "page" : undefined}><Settings2 size={20} /></Link></span></header>
      {pathname !== "/" && pathname !== "/settings" && <div className="demo-notice"><strong>Dữ liệu minh họa</strong><span> Các thay đổi trên màn hình này chỉ giữ trong phiên thử nghiệm.</span></div>}
      <main id="main-content" tabIndex={-1}>{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="Điều hướng điện thoại">{links.slice(0, 2).map(({ href, label, short, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={21} /><span>{short ?? label}</span></Link>)}<Link href="/add-meal" className="mobile-add" aria-label="Ghi bữa ăn" aria-current={pathname === "/add-meal" ? "page" : undefined}><Plus size={25} /></Link>{links.slice(2, 4).map(({ href, label, short, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={21} /><span>{short ?? label}</span></Link>)}</nav>
  </div>;
}
