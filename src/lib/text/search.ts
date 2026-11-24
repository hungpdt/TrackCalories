/** Chuẩn hóa để tìm kiếm tiếng Việt không dấu, không phân biệt hoa thường: "Phở Bò" → "pho bo". */
export function normalizeVi(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Mọi từ trong truy vấn đều xuất hiện trong tên (thứ tự tùy ý). */
export function matchesQuery(name: string, query: string) {
  const words = normalizeVi(query).split(" ").filter(Boolean);
  const target = normalizeVi(name);
  return words.every(word => target.includes(word));
}
