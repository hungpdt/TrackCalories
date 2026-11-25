/** Ngày hiện tại (YYYY-MM-DD) theo múi giờ IANA, dùng để chọn mục tiêu có hiệu lực. */
export function todayIn(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const typicalHour = { breakfast: 7, lunch: 12, dinner: 19, snack: 15 } as const;

/** Chênh lệch (ms) của múi giờ so với UTC tại một thời điểm. */
function offsetMs(timeZone: string, at: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at).map(part => [part.type, part.value]));
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return local - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * Giờ ăn khi tạo bữa: ghi cho hôm nay thì để database dùng giờ hiện tại (undefined);
 * ghi bù ngày khác thì lấy giờ điển hình của bữa (7h/12h/15h/19h) theo múi giờ hồ sơ, để giờ và thứ tự trong ngày hợp lý.
 */
export function eatenAtFor(date: string, mealType: keyof typeof typicalHour, timeZone: string, now = new Date()) {
  if (date === todayIn(timeZone, now)) return undefined;
  const [year, month, day] = date.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day, typicalHour[mealType]);
  return new Date(guess - offsetMs(timeZone, new Date(guess))).toISOString();
}
