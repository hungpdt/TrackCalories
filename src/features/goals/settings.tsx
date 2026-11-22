"use client";
import Link from "next/link";
import { Pencil, ShieldCheck, Target } from "lucide-react";
import { PageHeading } from "@/components/ui/shared";
import { useSavedProfile } from "@/features/goals/profile-store";
import { formatNumber } from "@/lib/demo/data";
import { calculateTargets, goals } from "@/lib/nutrition/targets";

export function Settings() {
  const profile = useSavedProfile();
  const plan = profile ? calculateTargets(profile).plan : undefined;
  const rows = plan ? [
    ["Calories", `${formatNumber(plan.kcal)} kcal/ngày`],
    ["Protein", `${formatNumber(plan.protein)} g/ngày`],
    ["Carbs", `${formatNumber(plan.carbs)} g/ngày`],
    ["Chất béo", `${formatNumber(plan.fat)} g/ngày`],
  ] as const : [];
  return <>
    <PageHeading eyebrow="PHÙ HỢP VỚI CHÍNH BẠN" title="Cài đặt & mục tiêu" description="Mục tiêu dưới đây là mục tiêu Dashboard đang dùng." />
    <div className="editor-grid">
      <section className="card">
        <h2>Mục tiêu dinh dưỡng</h2>
        {plan && profile ? <>
          <p className="muted">Tính từ hồ sơ bạn đã lưu trên trình duyệt này · {goals[profile.goal as keyof typeof goals].label}.</p>
          <dl className="settings-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <Link className="button" href="/#muc-tieu"><Pencil size={18} /> Chỉnh hồ sơ và mục tiêu</Link>
        </> : <>
          <p className="muted">Bạn chưa thiết lập mục tiêu. App không tự tạo mục tiêu mẫu cho bạn.</p>
          <Link className="button" href="/"><Target size={18} /> Thiết lập mục tiêu</Link>
        </>}
        <p className="small muted">Mục tiêu theo ngày hiệu lực sẽ có khi kết nối tài khoản.</p>
      </section>
      <div>
        <section className="card"><h2>Thiết lập dự kiến</h2><dl className="settings-list"><div><dt>Ngôn ngữ</dt><dd>Tiếng Việt</dd></div><div><dt>Đơn vị</dt><dd>kg, cm, g, ml</dd></div><div><dt>Múi giờ mặc định</dt><dd>Asia/Ho_Chi_Minh</dd></div><div><dt>Tài khoản</dt><dd>Chưa kết nối</dd></div></dl></section>
        <section className="privacy-note"><ShieldCheck size={24} /><div><h3>Dữ liệu của bạn, quyền của bạn</h3><p>Đăng nhập và dữ liệu riêng theo tài khoản sẽ được triển khai ở giai đoạn 2. Bản này không gửi dữ liệu đến AI.</p></div></section>
      </div>
    </div>
  </>;
}
