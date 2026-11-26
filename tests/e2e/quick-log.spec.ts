import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { makeDraft } from "./ai-draft";

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
  await page.locator(".quick-capture input[type=file][multiple]").setInputFiles(path.join(__dirname, "..", "fixtures", "meal.png"));
  await expect(page.getByRole("img", { name: "Ảnh bữa ăn 1" })).toBeVisible();
  await makeDraft(page);

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
  await expect(page).toHaveURL(/\/\?date=\d{4}-\d{2}-\d{2}/);
  await expect(page.locator(".kcal-card")).toContainText("700");
  await page.locator(".meal-card-title").first().click();
  await expect(page.getByText("Rau luộc")).toBeVisible();
  await expect(page.getByTitle("Ước tính AI").first()).toBeVisible();
  await page.goBack();
  await expect(page.locator(".kcal-card")).toContainText("700");
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
  await expect(page).toHaveURL(/\/\?date=/);
  await expect(page.locator(".kcal-card")).toContainText("620");
  await page.locator(".meal-card-title").first().click();
  await expect(page.getByText("1 tô", { exact: false })).toBeVisible();

  await expect(page).toHaveURL(/\/meals\//);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(page).toHaveURL(/\/\?date=/);
  await expect(page.locator(".meal-card")).toHaveCount(0);
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
  await expect(page.getByText("/ 2.759")).toBeVisible();

  await page.goto("/add-meal");
  await page.getByLabel("Ghi chú thêm").fill("400g phở bò");
  await makeDraft(page);
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.goto("/");
  await expect(page.locator(".kcal-card")).toContainText("600");
  await expect(page.locator(".kcal-card")).toContainText("2.159");
  await expect(page.locator(".meal-cards")).toContainText("phở bò");
  // Mục tiêu duy trì: P 112, C 405, F 77 g; đã ăn P 40, C 80, F 20 g.
  const remaining = page.locator(".macro-cards");
  await expect(remaining.locator(".protein")).toContainText("72g");
  await expect(remaining.locator(".carbs")).toContainText("325g");
  await expect(remaining.locator(".fat")).toContainText("57g");

  await page.goto("/add-meal");
  await page.getByLabel("Ghi chú thêm").fill("2000g mỡ");
  await makeDraft(page);
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.goto("/");
  await expect(remaining.locator(".fat")).toContainText("43g");
  await expect(remaining.locator(".fat")).toHaveClass(/over/);
  await expect(page.locator(".kcal-card")).toContainText("kcal vượt mục tiêu");
});

test("API ghi nhanh từ chối request không hợp lệ và trả JSON", async ({ page, playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL });
  const unauth = await anon.post("/api/ai/quick-log", { multipart: { note: "200g cơm" } });
  expect(unauth.status()).toBe(401);
  expect((await unauth.json()).error).toContain("Phiên đăng nhập");
  await anon.dispose();

  const api = page.request;
  const png = { name: "a.png", mimeType: "image/png", buffer: Buffer.from("day khong phai anh") };
  const spoofed = await api.post("/api/ai/quick-log", { multipart: { note: "", images: png } });
  expect(spoofed.status()).toBe(415);
  const heic = await api.post("/api/ai/quick-log", { multipart: { images: { name: "a.heic", mimeType: "image/heic", buffer: Buffer.from("x") } } });
  expect(heic.status()).toBe(415);
  expect((await heic.json()).error).toContain("HEIC");
  const empty = await api.post("/api/ai/quick-log", { multipart: { note: "   " } });
  expect(empty.status()).toBe(400);
  const noteAsFile = await api.post("/api/ai/quick-log", { multipart: { note: { name: "n.txt", mimeType: "text/plain", buffer: Buffer.from("200g cơm") } } });
  expect(noteAsFile.status()).toBe(400);
  const realPng = { name: "m.png", mimeType: "image/png", buffer: (await import("node:fs")).readFileSync(path.join(__dirname, "..", "fixtures", "meal.png")) };
  const form = new FormData();
  for (let index = 0; index < 5; index++) form.append("images", new Blob([realPng.buffer], { type: "image/png" }), `m${index}.png`);
  const tooMany = await api.post("/api/ai/quick-log", { multipart: form });
  expect(tooMany.status()).toBe(400);
});

test("mất mạng khi lưu vẫn giữ bản nháp; lưu lại không tạo bữa trùng", async ({ page }) => {
  await page.goto("/add-meal");
  await page.getByLabel("Ghi chú thêm").fill("250g bánh mì");
  await makeDraft(page);
  await expect(page.getByText(/Còn \d+ lượt AI hôm nay/)).toBeVisible();
  await item(page, 0).getByLabel("Tên món").fill("Bánh mì thịt");

  // Chặn đúng một lần POST server action, sau đó cho qua.
  let blocked = false;
  await page.route("**/add-meal*", async route => {
    if (!blocked && route.request().method() === "POST" && route.request().headers()["next-action"]) { blocked = true; await route.abort(); }
    else await route.continue();
  });
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page.getByText("Mất kết nối khi lưu", { exact: false })).toBeVisible();
  await expect(item(page, 0).getByLabel("Tên món")).toHaveValue("Bánh mì thịt");
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/\/\?date=/);
  await expect(page.locator(".meal-card")).toHaveCount(1);
  await expect(page.locator(".kcal-card")).toContainText("375");
});

test("đổi gram phải chọn tính lại hoặc giữ số; ngày không tồn tại không làm sập trang", async ({ page }) => {
  await page.goto("/add-meal");
  await page.getByLabel("Ghi chú thêm").fill("100g xôi");
  await makeDraft(page);
  await item(page, 0).getByLabel("Gram ăn (tùy chọn)").fill("180");
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page.getByText("chọn “Tính lại” hoặc “Giữ số đã nhập”", { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/add-meal/);
  await item(page, 0).getByRole("button", { name: "Giữ số đã nhập" }).click();
  await expect(item(page, 0).getByLabel("Calories (kcal)")).toHaveValue("150");
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/\/\?date=/);
  await page.locator(".meal-card-title").first().click();
  await expect(page.getByText("180 g", { exact: false })).toBeVisible();
  await page.goBack();
  await expect(page.locator(".kcal-card")).toContainText("150");

  for (const path of ["/history?date=2026-02-30", "/?date=9999-99-99"]) {
    await page.goto(path);
    await expect(page.locator(".home, .setup-page").first()).toBeVisible();
    await expect(page.getByText("Chưa tải được nội dung")).toHaveCount(0);
  }
});

test("AI chạy nền: trang chủ hiện thẻ vòng tiến độ, đi trang khác vẫn chạy và báo khi xong", async ({ page }) => {
  await page.goto("/add-meal");
  await page.getByLabel("Ghi chú thêm").fill("[chậm] 100g xôi");
  await page.getByRole("button", { name: "Tạo bản nháp" }).click();
  await expect(page).toHaveURL(/\/\?date=/);
  const card = page.locator(".ai-job-card");
  await expect(card).toContainText("Đang phân tích bữa ăn");
  await expect(card.locator(".ai-job-ring b")).toHaveText(/\d+%/);
  await page.getByRole("link", { name: "Tiến độ" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Bản nháp AI đã sẵn sàng" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("link", { name: "Kiểm tra" }).click();
  await expect(page.getByRole("heading", { name: "Kiểm tra bản nháp" })).toBeVisible();
  await expect(page.locator(".draft-item").first().getByLabel("Tên món")).toHaveValue("xôi");
  // Tải lại trang vẫn mở được bản nháp và số đã sửa.
  await page.locator(".draft-item").first().getByLabel("Tên món").fill("Xôi gà");
  await page.reload();
  await expect(page.locator(".draft-item").first().getByLabel("Tên món")).toHaveValue("Xôi gà");
  await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.locator(".ai-job-card")).toHaveCount(0);
  await expect(page.locator(".meal-cards")).toContainText("Xôi gà");
});
