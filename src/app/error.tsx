"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="card empty-state" role="alert"><h1>Chưa tải được nội dung</h1><p className="muted">Bạn có thể thử mở lại phần này.</p><button className="button" onClick={reset}>Thử lại</button></section>; }
