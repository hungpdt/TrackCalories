// Định dạng số/ngày kiểu Việt Nam và kiểu dinh dưỡng dùng chung.
export type Nutrients = { kcal: number; protein: number; carbs: number; fat: number };
export function formatNumber(value: number) { return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value); }
export function formatDate(value: string) { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
