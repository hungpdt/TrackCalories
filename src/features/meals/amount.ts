const qty = (value: number) => String(Math.round(value * 100) / 100).replace(".", ",");

/** Lượng đã ăn để hiển thị: "150 g", "250 ml", "2 × 1 tô", "1 tô", "1 gói". */
export function amountLabel(quantity: number, unit: string, servingLabel: string | null) {
  if (unit === "g" || unit === "ml") return `${qty(quantity)} ${unit}`;
  const label = servingLabel?.trim() || (unit === "package" ? "gói" : "phần");
  if (!servingLabel?.trim()) return `${qty(quantity)} ${label}`;
  return quantity === 1 ? label : `${qty(quantity)} × ${label}`;
}
