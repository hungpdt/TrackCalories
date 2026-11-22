import { expect, test, type Page } from "@playwright/test";

async function fillBody(page: Page) {
  await page.getByLabel("Cân nặng (kg)").fill("80,0");
  await page.getByLabel("Chiều cao (cm)").fill("180");
  await page.getByLabel("Tuổi", { exact: true }).fill("30");
  await page.getByLabel("Giới tính dùng cho công thức").selectOption("male");
  await page.getByLabel("Tỉ lệ mỡ (%) · tùy chọn").fill("20");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Mức vận động").selectOption("moderate");
}

test("thiết lập lần đầu, tính thâm hụt, lưu và xóa mục tiêu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Thiết lập mục tiêu của bạn" })).toBeVisible();
  await fillBody(page);
  await page.getByRole("combobox", { name: "Mục tiêu", exact: true }).selectOption("loss");
  await page.getByLabel("Calorie cắt giảm mỗi tuần (kcal)").fill("3501");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("3500");
  await page.getByLabel("Calorie cắt giảm mỗi tuần (kcal)").fill("1750");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Món bạn hay ăn").fill("Cơm gà");
  await page.getByLabel("Món bạn thích").fill("Phở bò");
  await page.getByRole("button", { name: "Tính calories và macro" }).click();
  await expect(page.getByTestId("intake")).toHaveText("2.509");
  await expect(page.getByText("2.759 kcal/ngày")).toBeVisible();
  await expect(page.getByText("1.750 kcal/tuần")).toBeVisible();
  for (const value of ["128 g", "342 g", "70 g"]) await expect(page.getByText(value, { exact: true })).toBeVisible();
  await expect(page.getByText("Cơm gà", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Lưu mục tiêu trên thiết bị" }).click();
  await page.reload();
  await expect(page.getByTestId("intake")).toHaveText("2.509");
  await page.getByRole("button", { name: "Xóa thông tin trên thiết bị" }).click();
  await expect(page.getByRole("heading", { name: "Thiết lập mục tiêu của bạn" })).toBeVisible();
});

test("sau khi lưu: Tổng quan hiện Dashboard, Cài đặt dùng cùng mục tiêu và vào được trên mọi màn hình", async ({ page, isMobile }) => {
  await page.goto("/settings");
  await expect(page.getByText("Bạn chưa thiết lập mục tiêu", { exact: false })).toBeVisible();
  await page.goto("/");
  await fillBody(page);
  await page.getByRole("combobox", { name: "Mục tiêu", exact: true }).selectOption("loss");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tính calories và macro" }).click();
  await page.getByRole("button", { name: "Lưu mục tiêu trên thiết bị" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Một ngày của bạn" })).toBeVisible();
  await expect(page.getByText("/ 2.509 kcal")).toBeVisible();
  await expect(page.getByTestId("intake")).toHaveText("2.509");
  if (isMobile) await page.locator(".mobile-settings").click();
  else await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Cài đặt" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText("2.509 kcal/ngày")).toBeVisible();
  await expect(page.getByText("2000", { exact: false })).toHaveCount(0);
});

test("tăng cân và tăng cơ giảm mỡ áp dụng đúng dấu, ẩn món khi có dị ứng", async ({ page }) => {
  await page.goto("/");
  await fillBody(page);
  await page.getByRole("combobox", { name: "Mục tiêu", exact: true }).selectOption("gain");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Món bạn hay ăn").fill("Bún tôm");
  await page.getByLabel("Món hoặc thành phần gây dị ứng").fill("Tôm");
  await page.getByRole("button", { name: "Tính calories và macro" }).click();
  await expect(page.getByTestId("intake")).toHaveText("2.959");
  await expect(page.getByText("Thặng dư mỗi tuần")).toBeVisible();
  await expect(page.getByText("Đã tạm ẩn gợi ý", { exact: false })).toBeVisible();
  await expect(page.getByText("Bún tôm", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Chỉnh thông tin" }).click();
  await expect(page.getByLabel("Cân nặng (kg)")).toHaveValue("80,0");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("combobox", { name: "Mục tiêu", exact: true }).selectOption("recomposition");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByLabel("Món hoặc thành phần gây dị ứng")).toHaveValue("Tôm");
  await page.getByRole("button", { name: "Tính calories và macro" }).click();
  await expect(page.getByTestId("intake")).toHaveText("2.659");
});
