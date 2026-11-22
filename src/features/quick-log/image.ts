/**
 * Thu nhỏ ảnh trên thiết bị trước khi gửi (cạnh dài tối đa 1600 px, JPEG): giảm dung lượng và chi phí AI.
 * Ảnh HEIC chỉ đọc được trên trình duyệt hỗ trợ (Safari); nơi khác báo lỗi để người dùng chọn JPEG/PNG.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
      ? "Trình duyệt này chưa đọc được ảnh HEIC. Chọn ảnh JPEG hoặc PNG."
      : "Không đọc được ảnh này. Chọn ảnh JPEG hoặc PNG khác.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không xử lý được ảnh trên thiết bị này.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("Không nén được ảnh.")), "image/jpeg", quality));
}
