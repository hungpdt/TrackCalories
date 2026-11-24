import Link from "next/link";
import { LogOut, Pencil, ShieldCheck, Target } from "lucide-react";
import { PageHeading } from "@/components/ui/shared";
import { signOut } from "@/features/auth/actions";
import { formatNumber, type Nutrients } from "@/lib/format";
import { goals } from "@/lib/nutrition/targets";

export function Settings({ email, timezone, goalType, effectiveFrom, targets }: {
  email: string | null;
  timezone: string;
  goalType: string | null;
  effectiveFrom: string | null;
  targets: Nutrients | null;
}) {
  const rows = targets ? [
    ["Calories", `${formatNumber(targets.kcal)} kcal/ngày`],
    ["Protein", `${formatNumber(targets.protein)} g/ngày`],
    ["Carbs", `${formatNumber(targets.carbs)} g/ngày`],
    ["Chất béo", `${formatNumber(targets.fat)} g/ngày`],
  ] as const : [];
  const goalLabel = goalType ? goals[goalType as keyof typeof goals]?.label : undefined;
  return <>
    <PageHeading eyebrow="PHÙ HỢP VỚI CHÍNH BẠN" title="Cài đặt & mục tiêu" description="Mục tiêu dưới đây là mục tiêu Dashboard đang dùng." />
    <div className="editor-grid">
      <section className="card">
        <h2>Mục tiêu dinh dưỡng</h2>
        {targets ? <>
          <p className="muted">Lưu trong tài khoản{goalLabel ? ` · ${goalLabel}` : ""}{effectiveFrom ? ` · hiệu lực từ ${effectiveFrom.split("-").reverse().join("/")}` : ""}.</p>
          <dl className="settings-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <Link className="button" href="/#muc-tieu"><Pencil size={18} /> Chỉnh hồ sơ và mục tiêu</Link>
        </> : <>
          <p className="muted">Bạn chưa thiết lập mục tiêu. App không tự tạo mục tiêu mẫu cho bạn.</p>
          <Link className="button" href="/"><Target size={18} /> Thiết lập mục tiêu</Link>
        </>}
        <p className="small muted settings-note">Sửa mục tiêu tạo phiên bản mới có hiệu lực từ hôm nay; ngày cũ giữ mục tiêu cũ.</p>
      </section>
      <div>
        <section className="card">
          <h2>Tài khoản</h2>
          <dl className="settings-list">
            <div><dt>Email</dt><dd className="settings-email">{email ?? "—"}</dd></div>
            <div><dt>Ngôn ngữ</dt><dd>Tiếng Việt</dd></div>
            <div><dt>Đơn vị</dt><dd>kg, cm, g, ml</dd></div>
            <div><dt>Múi giờ</dt><dd>{timezone}</dd></div>
          </dl>
          <form action={signOut}><button className="button secondary full-width" type="submit"><LogOut size={18} /> Đăng xuất</button></form>
        </section>
        <section className="privacy-note"><ShieldCheck size={24} /><div><h3>Dữ liệu của bạn, quyền của bạn</h3><p>Dữ liệu được lưu riêng theo tài khoản và chỉ tài khoản của bạn đọc được. Kho món, nhật ký và cân nặng trong các trang khác vẫn là dữ liệu minh họa cho tới các giai đoạn tiếp theo.</p></div></section>
      </div>
    </div>
  </>;
}
