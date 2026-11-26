import { expect, type Page } from "@playwright/test";

/** AI chạy nền: bấm Tạo bản nháp → về trang chủ → thẻ "Bản nháp sẵn sàng" → mở bản nháp để kiểm tra. */
export async function makeDraft(page: Page) {
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await expect(page).toHaveURL(/\/\?date=\d{4}-\d{2}-\d{2}/);
  await page.getByRole("link", { name: /Bản nháp sẵn sàng/ }).first().click();
  await expect(page.getByRole("heading", { name: "Kiểm tra bản nháp" })).toBeVisible();
}
