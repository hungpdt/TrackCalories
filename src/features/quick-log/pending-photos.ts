// Ảnh chọn từ bảng "+" (thanh dưới) được giữ tạm trong bộ nhớ trang để màn Ghi nhanh lấy ra sau khi chuyển trang.
// Không lưu ra ổ đĩa hay localStorage; tải lại trang là mất (người dùng chọn lại).
let pending: File[] = [];

export function setPendingPhotos(files: FileList | File[] | null) {
  pending = files ? Array.from(files) : [];
}

export function takePendingPhotos(): File[] {
  const files = pending;
  pending = [];
  return files;
}
