/** Ngày hiện tại (YYYY-MM-DD) theo múi giờ IANA, dùng để chọn mục tiêu có hiệu lực. */
export function todayIn(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
