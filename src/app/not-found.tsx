import Link from "next/link";
export default function NotFound() { return <section className="card empty-state"><h1>Không tìm thấy trang</h1><p className="muted">Đường dẫn này không có trong ứng dụng.</p><Link className="button" href="/">Về tổng quan</Link></section>; }
