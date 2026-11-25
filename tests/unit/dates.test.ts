import { describe, expect, it } from "vitest";
import { eatenAtFor, todayIn } from "@/lib/dates/today";
import { amountLabel } from "@/features/meals/amount";

describe("giờ ăn khi ghi bù", () => {
  const now = new Date("2026-11-25T03:00:00Z"); // 10:00 ở Việt Nam
  it("ghi cho hôm nay: để database dùng giờ hiện tại", () => {
    expect(todayIn("Asia/Ho_Chi_Minh", now)).toBe("2026-11-25");
    expect(eatenAtFor("2026-11-25", "lunch", "Asia/Ho_Chi_Minh", now)).toBeUndefined();
  });
  it("ngày khác: giờ điển hình của bữa theo múi giờ hồ sơ", () => {
    expect(eatenAtFor("2026-11-20", "breakfast", "Asia/Ho_Chi_Minh", now)).toBe("2026-11-20T00:00:00.000Z");
    expect(eatenAtFor("2026-11-20", "dinner", "Asia/Ho_Chi_Minh", now)).toBe("2026-11-20T12:00:00.000Z");
    expect(eatenAtFor("2026-07-01", "lunch", "Europe/Berlin", now)).toBe("2026-07-01T10:00:00.000Z");
  });
});

describe("hiển thị lượng đã ăn", () => {
  it("gram, ml, khẩu phần có số lượng, gói", () => {
    expect(amountLabel(150, "g", null)).toBe("150 g");
    expect(amountLabel(250, "ml", null)).toBe("250 ml");
    expect(amountLabel(2, "serving", "1 tô")).toBe("2 × 1 tô");
    expect(amountLabel(1, "serving", "1 tô")).toBe("1 tô");
    expect(amountLabel(1.5, "serving", null)).toBe("1,5 phần");
    expect(amountLabel(1, "package", null)).toBe("1 gói");
  });
});
