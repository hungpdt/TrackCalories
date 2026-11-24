import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Kho món thật (database) + bảng "+" của phương án A. Số liệu là ví dụ giả lập.
async function signUp(page: Page) {
  await page.goto("/login");
  await page.getByRole("group", { name: "Chọn thao tác" }).getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.getByLabel("Email").fill(`lib-${randomUUID()}@example.test`);
  await page.getByLabel("Mật khẩu").fill("e2e-password-123");
  await page.locator("form").getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function createFood(page: Page, food: { name: string; basis: string; label?: string; grams?: string; kcal: string; protein: string; carbs: string; fat: string }) {
  await page.goto("/foods/new");
  await page.getByLabel("Tên món").fill(food.name);
  await page.getByRole("group", { name: "Số liệu tính cho" }).getByRole("button", { name: food.basis }).click();
  if (food.label) await page.getByLabel("Tên khẩu phần (tùy chọn)").fill(food.label);
  if (food.grams) await page.getByLabel("Khoảng bao nhiêu gram (tùy chọn)").fill(food.grams);
  await page.getByLabel("Calories (kcal)").fill(food.kcal);
  await page.getByLabel("Protein (g)").fill(food.protein);
  await page.getByLabel("Carbs (g)").fill(food.carbs);
  await page.getByLabel("Chất béo (g)").fill(food.fat);
  await page.getByRole("button", { name: "Lưu vào kho" }).click();
  await expect(page).toHaveURL(/\/foods$/);
}

const pho = { name: "Phở bò", basis: "1 khẩu phần", label: "1 tô", grams: "500", kcal: "450", protein: "28", carbs: "58", fat: "12" };
const rice = { name: "Cơm trắng", basis: "100 g", kcal: "130", protein: "2,7", carbs: "28", fat: "0,3" };

test.beforeEach(async ({ page }) => { await signUp(page); });

test("tạo món, tìm không dấu, yêu thích, thêm 1,5 tô và 200 g vào nhật ký", async ({ page }) => {
  await page.goto("/foods");
  await expect(page.getByText("Kho món đang trống")).toBeVisible();
  await createFood(page, pho);
  await createFood(page, rice);

  await page.getByLabel("Tìm món ăn").fill("pho bo");
  await expect(page.locator(".food-row")).toHaveCount(1);
  await expect(page.locator(".food-row")).toContainText("1 tô (~500 g) · 450 kcal");
  await page.getByLabel("Tìm món ăn").fill("");

  await page.getByRole("button", { name: /Phở bò/ }).click();
  const sheet = page.getByRole("dialog", { name: "Phở bò" });
  await sheet.getByRole("button", { name: "Yêu thích" }).click();
  await expect(sheet.getByRole("button", { name: "Bỏ yêu thích" })).toBeVisible();
  await sheet.getByRole("button", { name: "Thêm vào bữa" }).click();
  const amount = page.getByRole("dialog", { name: /Ăn bao nhiêu Phở bò/ });
  await amount.getByRole("button", { name: "1,5" }).click();
  await expect(amount.locator(".amount-total")).toContainText("675 kcal");
  await expect(amount.locator(".amount-total")).toContainText("P 42 · C 87 · F 18 g");
  await amount.getByRole("button", { name: "Bữa trưa" }).click();
  await amount.getByRole("button", { name: "Lưu vào nhật ký" }).click();
  await expect(page).toHaveURL(/\/history\?date=.*saved=1/);
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu bữa ăn." })).toBeVisible();
  await expect(page.locator(".summary-strip")).toContainText("675");

  await page.goto("/foods");
  await page.getByRole("group", { name: "Lọc món" }).getByRole("button", { name: "Yêu thích" }).click();
  await expect(page.locator(".food-row")).toHaveCount(1);
  await page.getByRole("group", { name: "Lọc món" }).getByRole("button", { name: "Tất cả" }).click();

  await page.getByRole("button", { name: /Cơm trắng/ }).click();
  await page.getByRole("dialog", { name: "Cơm trắng" }).getByRole("button", { name: "Thêm vào bữa" }).click();
  const riceAmount = page.getByRole("dialog", { name: /Ăn bao nhiêu Cơm trắng/ });
  await riceAmount.getByLabel(/Lượng ăn/).fill("200");
  await expect(riceAmount.locator(".amount-total")).toContainText("260 kcal");
  await riceAmount.getByRole("button", { name: "Lưu vào nhật ký" }).click();
  await expect(page.locator(".summary-strip")).toContainText("935");

  await page.goto("/foods");
  await page.getByRole("group", { name: "Lọc món" }).getByRole("button", { name: "Gần đây" }).click();
  await expect(page.locator(".food-row")).toHaveCount(2);
});

test("món theo khẩu phần có gram: chọn đơn vị gram; sửa và xóa món không đổi bữa đã ghi", async ({ page }) => {
  await createFood(page, pho);
  await page.getByRole("button", { name: /Phở bò/ }).click();
  await page.getByRole("dialog", { name: "Phở bò" }).getByRole("button", { name: "Thêm vào bữa" }).click();
  const amount = page.getByRole("dialog", { name: /Ăn bao nhiêu/ });
  await amount.getByRole("group", { name: "Đơn vị" }).getByRole("button", { name: "g", exact: true }).click();
  await amount.getByLabel(/Lượng ăn/).fill("250");
  await expect(amount.locator(".amount-total")).toContainText("225 kcal");
  await amount.getByRole("button", { name: "Lưu vào nhật ký" }).click();
  await expect(page.locator(".summary-strip")).toContainText("225");
  await expect(page.getByText("250 g")).toBeVisible();

  await page.goto("/foods");
  await page.getByRole("button", { name: /Phở bò/ }).click();
  await page.getByRole("dialog", { name: "Phở bò" }).getByRole("link", { name: "Sửa" }).click();
  await expect(page.getByLabel("Calories (kcal)")).toHaveValue("450");
  await page.getByLabel("Calories (kcal)").fill("600");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.locator(".food-row")).toContainText("600 kcal");

  await page.getByRole("button", { name: /Phở bò/ }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("dialog", { name: "Phở bò" }).getByRole("button", { name: "Xóa" }).click();
  await expect(page.getByText("Kho món đang trống")).toBeVisible();

  await page.goto("/history");
  await expect(page.locator(".summary-strip")).toContainText("225");
  await expect(page.getByText("Phở bò")).toBeVisible();
});

test("tích Lưu vào kho trong bản nháp AI thì món xuất hiện trong kho, lưu lại không trùng", async ({ page }) => {
  await page.goto("/add-meal");
  await page.getByLabel("Ghi chú thêm").fill("200g cơm tấm");
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await page.getByLabel("Lưu món này vào kho để lần sau chọn nhanh").check();
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.goto("/foods");
  await expect(page.locator(".food-row")).toHaveCount(1);
  await expect(page.locator(".food-row")).toContainText("cơm tấm");
  await expect(page.locator(".food-row")).toContainText("100 g · 150 kcal");

  await page.goto("/add-meal");
  await page.getByLabel("Ghi chú thêm").fill("200g cơm tấm");
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await page.getByLabel("Lưu món này vào kho để lần sau chọn nhanh").check();
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await page.goto("/foods");
  await expect(page.locator(".food-row")).toHaveCount(1);
});

test("bảng + trên điện thoại: nhập tay, chụp ảnh, nói/gõ, kho món", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Thanh dưới chỉ có trên điện thoại");
  await page.goto("/history");
  const plus = page.getByRole("navigation", { name: "Điều hướng điện thoại" }).getByRole("button", { name: "Ghi bữa ăn" });
  await plus.click();
  const sheet = page.getByRole("dialog", { name: "Ghi bữa ăn" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Chụp ảnh")).toBeVisible();
  await sheet.getByRole("button", { name: "Nhập tay" }).click();
  await expect(page).toHaveURL(/mode=manual/);
  await expect(page.getByRole("heading", { name: "Kiểm tra bản nháp" })).toBeVisible();

  await page.goto("/history");
  await plus.click();
  await sheet.locator("input[type=file][capture]").setInputFiles(path.join(__dirname, "..", "fixtures", "meal.png"));
  await expect(page).toHaveURL(/\/add-meal\?open=\d+$/);
  await expect(page.getByRole("img", { name: "Ảnh bữa ăn 1" })).toBeVisible();

  await plus.click();
  await sheet.getByRole("button", { name: "Nói / gõ" }).click();
  await expect(page).toHaveURL(/mode=note/);
  await expect(page.getByLabel("Ghi chú thêm")).toBeFocused();

  await plus.click();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await plus.click();
  await sheet.getByRole("button", { name: "Chọn từ kho món" }).click();
  await expect(page).toHaveURL(/\/foods$/);
});

test("đang xem ngày hôm qua: bấm + / Ghi bữa ăn / kho món thì món lưu vào đúng ngày đó", async ({ page, isMobile }) => {
  const today = await page.evaluate(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()));
  const yesterdayDate = new Date(`${today}T00:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  await page.goto(`/history?date=${yesterday}`);
  if (isMobile) {
    await page.getByRole("navigation", { name: "Điều hướng điện thoại" }).getByRole("button", { name: "Ghi bữa ăn" }).click();
    await page.getByRole("dialog", { name: "Ghi bữa ăn" }).getByRole("button", { name: "Nhập tay" }).click();
  } else {
    await page.getByRole("main").getByRole("link", { name: "Ghi bữa ăn" }).first().click();
    await page.getByRole("button", { name: "Nhập thủ công" }).click();
  }
  await expect(page.getByLabel("Ngày ăn")).toHaveValue(yesterday);
  const item = page.locator(".draft-item").first();
  await item.getByLabel("Tên món").fill("Bánh mì hôm qua");
  for (const [label, value] of [["Calories (kcal)", "400"], ["Protein (g)", "15"], ["Carbs (g)", "50"], ["Chất béo (g)", "12"]]) await item.getByLabel(label).fill(value);
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(new RegExp(`/history\\?date=${yesterday}&`));
  await expect(page.getByText("Bánh mì hôm qua")).toBeVisible();
  await page.goto(`/history?date=${today}`);
  await expect(page.getByText("Bánh mì hôm qua")).toHaveCount(0);

  await createFood(page, rice);
  await page.goto(`/history?date=${yesterday}`);
  if (isMobile) {
    await page.getByRole("navigation", { name: "Điều hướng điện thoại" }).getByRole("button", { name: "Ghi bữa ăn" }).click();
    await page.getByRole("dialog", { name: "Ghi bữa ăn" }).getByRole("button", { name: "Chọn từ kho món" }).click();
  } else {
    await page.goto(`/foods?date=${yesterday}`);
  }
  await page.getByRole("button", { name: /Cơm trắng/ }).click();
  await page.getByRole("dialog", { name: "Cơm trắng" }).getByRole("button", { name: "Thêm vào bữa" }).click();
  await expect(page.getByRole("dialog", { name: /Ăn bao nhiêu/ }).getByLabel("Ngày ăn")).toHaveValue(yesterday);
});
