import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Nhật ký cân nặng lưu database (trước đây là dữ liệu minh họa, tải lại là mất). Số liệu giả lập.
async function signUp(page: Page) {
  await page.goto("/login");
  await page.getByRole("group", { name: "Chọn thao tác" }).getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.getByLabel("Email").fill(`w-${randomUUID()}@example.test`);
  await page.getByLabel("Mật khẩu").fill("e2e-password-123");
  await page.locator("form").getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function addWeight(page: Page, kg: string, date?: string) {
  await page.getByRole("main").getByRole("button", { name: "Ghi cân nặng" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Ghi cân nặng" });
  if (date) await sheet.getByLabel("Ngày").fill(date);
  await sheet.getByLabel("Cân nặng (kg)").fill(kg);
  await sheet.getByRole("button", { name: "Lưu" }).click();
  return sheet;
}

const shift = (iso: string, days: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const vn = (iso: string) => iso.split("-").reverse().join("/");

test.beforeEach(async ({ page }) => { await signUp(page); });

test("ghi 71,7 kg, tải lại vẫn còn; trùng ngày hỏi trước; sửa, xóa; biểu đồ theo khoảng", async ({ page }) => {
  const today = await page.evaluate(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()));
  await page.goto("/weight");
  await expect(page.getByText("Chưa có số đo nào")).toBeVisible();
  await expect(page.locator(".demo-notice")).toHaveCount(0);

  await addWeight(page, "71,7");
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu 71,7 kg." })).toBeVisible();
  await page.reload();
  await expect(page.locator(".weight-headline")).toContainText("71,7");

  await addWeight(page, "72,1", shift(today, -40));
  await addWeight(page, "71,9", shift(today, -10));
  await expect(page.locator(".weight-list li")).toHaveCount(3);
  await expect(page.locator(".weight-headline")).toContainText("−0,4 kg");
  await expect(page.locator(".weight-chart circle")).toHaveCount(2);
  await page.getByRole("group", { name: "Khoảng thời gian" }).getByRole("button", { name: "90 ngày" }).click();
  await expect(page.locator(".weight-chart circle")).toHaveCount(3);

  const sheet = await addWeight(page, "71,2");
  await expect(sheet.getByText(`Ngày ${vn(today)} đã ghi 71,7 kg. Thay bằng 71,2 kg?`)).toBeVisible();
  await sheet.getByRole("button", { name: "Giữ 71,7 kg" }).click();
  await expect(page.locator(".weight-headline")).toContainText("71,7");
  const again = await addWeight(page, "71,2");
  await again.getByRole("button", { name: "Cập nhật" }).click();
  await expect(page.locator(".weight-headline")).toContainText("71,2");
  await expect(page.locator(".weight-list li")).toHaveCount(3);

  await page.getByRole("button", { name: `Sửa hoặc xóa số đo ngày ${vn(shift(today, -10))}` }).click();
  const edit = page.getByRole("dialog", { name: `Số đo ${vn(shift(today, -10))}` });
  await edit.getByLabel("Cân nặng (kg)").fill("71,5");
  await edit.getByRole("button", { name: "Lưu" }).click();
  await expect(page.locator(".weight-list")).toContainText("71,5 kg");
  await page.getByRole("button", { name: `Sửa hoặc xóa số đo ngày ${vn(shift(today, -10))}` }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("dialog", { name: /Số đo/ }).getByRole("button", { name: "Xóa" }).click();
  await expect(page.locator(".weight-list li")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".weight-list li")).toHaveCount(2);
});

test("từ chối cân nặng sai định dạng hoặc ngoài khoảng", async ({ page }) => {
  await page.goto("/weight");
  for (const [value, message] of [["1.200", "dấu phẩy"], ["0", "từ 20 đến 350"], ["abc", "từ 20 đến 350"], ["400", "từ 20 đến 350"]]) {
    const sheet = await addWeight(page, value);
    await expect(sheet.getByRole("alert")).toContainText(message);
    await page.keyboard.press("Escape");
  }
  await expect(page.getByText("Chưa có số đo nào")).toBeVisible();
});

test("lệch từ 2 kg so với lúc đặt mục tiêu thì gợi ý tính lại, không tự đổi mục tiêu", async ({ page }) => {
  await page.getByLabel("Cân nặng (kg)").fill("80");
  await page.getByLabel("Chiều cao (cm)").fill("180");
  await page.getByLabel("Tuổi", { exact: true }).fill("30");
  await page.getByLabel("Giới tính dùng cho công thức").selectOption("male");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Mức vận động").selectOption("moderate");
  await page.getByRole("combobox", { name: "Mục tiêu", exact: true }).selectOption("maintain");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tính calories và macro" }).click();
  await page.getByRole("button", { name: "Lưu mục tiêu" }).click();
  await expect(page.getByText("/ 2.759")).toBeVisible();

  await page.goto("/weight");
  await expect(page.locator(".weight-headline")).toContainText("80");
  await expect(page.locator(".recalc-banner")).toHaveCount(0);
  const sheet = await addWeight(page, "77,5");
  await sheet.getByRole("button", { name: "Cập nhật" }).click();
  await expect(page.locator(".recalc-banner")).toContainText("giảm 2,5 kg so với lúc đặt mục tiêu (80 kg)");
  await page.getByRole("link", { name: "Tính lại" }).click();
  await expect(page.getByRole("button", { name: "Chỉnh thông tin" })).toBeVisible();
  await expect(page.getByText("/ 2.759")).toBeVisible();
});
