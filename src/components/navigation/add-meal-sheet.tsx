"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Camera, Image as ImageIcon, Mic, Pencil } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { setPendingPhotos } from "@/features/quick-log/pending-photos";

/**
 * Bảng chọn khi bấm "+" ở thanh dưới (phương án A). Chụp/chọn ảnh mở camera/thư viện ngay tại đây
 * (trình duyệt chỉ cho mở khi người dùng chạm trực tiếp), rồi chuyển ảnh sang màn Ghi nhanh.
 */
export function AddMealSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string | null }) {
  const router = useRouter();

  // Mỗi lựa chọn mở màn Ghi bữa ăn như lần mở mới (kể cả khi đang ở sẵn màn đó): thêm mã lần mở.
  function go(href: string) {
    onClose();
    // Mang theo ngày đang xem (Tổng quan/Nhật ký ?date=) để món lưu đúng ngày, không mặc định hôm nay.
    const params = new URLSearchParams(href.split("?")[1]);
    if (date) params.set("date", date);
    if (href.startsWith("/add-meal")) params.set("open", String(Date.now()));
    const query = params.toString();
    router.push(`${href.split("?")[0]}${query ? `?${query}` : ""}`);
  }

  function pick(files: FileList | null) {
    if (!files?.length) return;
    setPendingPhotos(files);
    go("/add-meal");
  }

  return <Sheet open={open} onClose={onClose} title="Ghi bữa ăn">
    <div className="add-options">
      <label className="add-option">
        <Camera size={24} aria-hidden="true" /><span>Chụp ảnh</span>
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={event => { pick(event.target.files); event.target.value = ""; }} />
      </label>
      <label className="add-option">
        <ImageIcon size={24} aria-hidden="true" /><span>Chọn ảnh</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={event => { pick(event.target.files); event.target.value = ""; }} />
      </label>
      <button type="button" className="add-option" onClick={() => go("/add-meal?mode=note")}><Mic size={24} aria-hidden="true" /><span>Nói / gõ</span></button>
      <button type="button" className="add-option" onClick={() => go("/add-meal?mode=manual")}><Pencil size={24} aria-hidden="true" /><span>Nhập tay</span></button>
      <button type="button" className="add-option wide" onClick={() => go("/foods")}><BookOpen size={24} aria-hidden="true" /><span>Chọn từ kho món</span></button>
    </div>
  </Sheet>;
}
