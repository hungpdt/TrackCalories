import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Cần Supabase local và AI_PROVIDER=mock (AI giả lập: 1,5 kcal/g; mỗi ảnh thêm một món thiếu dinh dưỡng).
const home = /127\.0\.0\.1:\d+\/$/;

async function signUp(page: Page) {
  await page.goto("/login");
  await page.getByRole("group", { name: "Chọn thao tác" }).getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.getByLabel("Email").fill(`ql-${randomUUID()}@example.test`);
  await page.getByLabel("Mật khẩu").fill("e2e-password-123");
  await page.locator("form").getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page).toHaveURL(home);
}

const item = (page: Page, index: number) => page.locator(".draft-item").nth(index);

test.beforeEach(async ({ page }) => { await signUp(page); });

test("ghi nhanh bằng ảnh + ghi chú: bản nháp nhiều món, bổ sung số thiếu, tính lại theo gram, lưu", async ({ page }) => {
  await page.goto("/add-meal");
  await expect(page.getByRole("heading", { name: "Ghi một bữa ăn" })).toBeVisible();
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await expect(page.locator(".quick-capture").getByRole("alert")).toContainText("Thêm ít nhất một ảnh hoặc ghi chú");

  await page.getByLabel("Ghi chú thêm").fill("200g cơm trắng, 100g ức gà");
  await page.locator("input[type=file][multiple]").setInputFiles(path.join(__dirname, "..", "fixtures", "meal.png"));
  await expect(page.getByRole("img", { name: "Ảnh bữa ăn 1" })).toBeVisible();
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();

  await expect(page.getByRole("heading", { name: "Kiểm tra bản nháp" })).toBeVisible();
  await expect(page.locator(".draft-item")).toHaveCount(3);
  await expect(item(page, 0).getByLabel("Tên món")).toHaveValue("cơm trắng");
  await expect(item(page, 0).getByLabel("Calories (kcal)")).toHaveValue("300");
  await expect(item(page, 2).getByText("Cần kiểm tra")).toBeVisible();
  await expect(item(page, 2).getByLabel("Calories (kcal)")).toHaveValue("");

  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page.getByText("Bổ sung các ô được đánh dấu", { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/add-meal/);

  await item(page, 0).getByLabel("Gram ăn (tùy chọn)").fill("300");
  await item(page, 0).getByRole("button", { name: /Tính lại dinh dưỡng theo 300 g/ }).click();
  await expect(item(page, 0).getByLabel("Calories (kcal)")).toHaveValue("450");

  const third = item(page, 2);
  await third.getByLabel("Tên món").fill("Rau luộc");
  await third.getByLabel("Calories (kcal)").fill("100");
  await third.getByLabel("Protein (g)").fill("3");
  await third.getByLabel("Carbs (g)").fill("10,5");
  await third.getByLabel("Chất béo (g)").fill("0");
  await expect(page.locator(".draft-total")).toContainText("700 kcal");

  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/\/history\?date=\d{4}-\d{2}-\d{2}/);
  await expect(page.locator(".summary-strip")).toContainText("700");
  await expect(page.getByText("Rau luộc")).toBeVisible();
  await expect(page.getByText("Ước tính AI").first()).toBeVisible();
  await page.reload();
  await expect(page.locator(".summary-strip")).toContainText("700");
});

test("nhập thủ công: từ chối số dạng hàng nghìn, lưu, rồi xóa bữa", async ({ page }) => {
  await page.goto("/add-meal");
  await page.getByRole("button", { name: "Nhập thủ công" }).click();
  const first = item(page, 0);
  await first.getByLabel("Tên món").fill("Bún bò");
  await first.getByLabel("Khẩu phần (tùy chọn)").fill("1 tô");
  await first.getByLabel("Calories (kcal)").fill("1.200");
  await first.getByLabel("Protein (g)").fill("30");
  await first.getByLabel("Carbs (g)").fill("80");
  await first.getByLabel("Chất béo (g)").fill("2,5");
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(first.getByRole("alert")).toContainText("kcal");
  await first.getByLabel("Calories (kcal)").fill("620");
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/\/history\?date=/);
  await expect(page.locator(".summary-strip")).toContainText("620");
  await expect(page.getByText("1 tô")).toBeVisible();

  page.once("dialog", dialog => dialog.accept());
  await page.locator(".day-meal").getByRole("button", { name: /^Xóa / }).click();
  await expect(page.getByText("Nhật ký đang trống")).toBeVisible();
});

test("bữa đã lưu hiện trên Dashboard với mục tiêu của ngày", async ({ page }) => {
  await page.goto("/");
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
  await expect(page.getByText("/ 2.759 kcal")).toBeVisible();

  await page.goto("/add-meal");
  await page.getByLabel("Ghi chú thêm").fill("400g phở bò");
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/\/history/);
  await page.goto("/");
  await expect(page.locator(".energy-card")).toContainText("600");
  await expect(page.locator(".energy-card")).toContainText("2.159");
  await expect(page.locator(".daily-meals")).toContainText("phở bò");
});
