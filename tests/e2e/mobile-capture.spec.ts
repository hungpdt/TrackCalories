import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Mô phỏng điện thoại mở app qua http không phải localhost (như http://192.168.x.x:3000 trong Wi-Fi):
// trình duyệt coi là "không an toàn" (không có crypto.randomUUID, không cho micro).
// tcgm.test được trỏ về 127.0.0.1 bằng cờ Chromium, không phụ thuộc IP thật của máy.
test.use({ launchOptions: { args: ["--host-resolver-rules=MAP tcgm.test 127.0.0.1"] } });

const photo = path.join(__dirname, "..", "fixtures", "meal.png");

/** Bộ nhận dạng giọng nói giả: mode "ok" trả chữ, "deny" báo lỗi quyền micro như Chrome thật. */
async function fakeSpeech(page: Page, mode: "ok" | "deny" | "none") {
  await page.addInitScript(([speechMode]) => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    if (speechMode === "none") return;
    class FakeRecognition {
      lang = ""; continuous = false; interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        w.__speechLang = this.lang;
        if (speechMode === "deny") { setTimeout(() => this.onerror?.({ error: "not-allowed" }), 20); return; }
        setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "hai trăm gam" } }] }), 20);
        setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "200g cơm tấm" } }] }), 60);
      }
      stop() { setTimeout(() => this.onend?.(), 10); }
    }
    w.webkitSpeechRecognition = FakeRecognition;
  }, [mode] as const);
}

async function signUp(page: Page) {
  await page.goto("/login");
  await page.getByRole("group", { name: "Chọn thao tác" }).getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.getByLabel("Email").fill(`mob-${randomUUID()}@example.test`);
  await page.getByLabel("Mật khẩu").fill("e2e-password-123");
  await page.locator("form").getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("điện thoại qua http trong mạng LAN (trang không an toàn)", () => {
  test.use({ baseURL: "http://tcgm.test:3100" });

  test("chụp ảnh và chọn ảnh hoạt động, lưu được bữa ăn", async ({ page }) => {
    await fakeSpeech(page, "deny");
    await signUp(page);
    expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
    await page.goto("/add-meal");
    // Chờ React hydrate xong (dòng hướng dẫn chỉ hiện ở client) rồi mới chọn file.
    await expect(page.getByText("nút Nói không dùng được", { exact: false })).toBeVisible();
    await page.locator(".quick-capture input[type=file][capture]").setInputFiles(photo);
    await expect(page.getByRole("img", { name: "Ảnh bữa ăn 1" })).toBeVisible();
    await page.locator(".quick-capture input[type=file][multiple]").setInputFiles([photo, photo]);
    await expect(page.locator(".photo-thumb")).toHaveCount(3);
    await page.getByRole("button", { name: "Bỏ ảnh 2" }).click();
    await expect(page.locator(".photo-thumb")).toHaveCount(2);
    await expect(page.locator(".quick-capture [role=alert]")).toHaveCount(0);
    await page.getByLabel("Ghi chú thêm").fill("150g bún chả");
    await page.getByRole("button", { name: "Tạo bản nháp" }).click();
    await expect(page.getByRole("heading", { name: "Kiểm tra bản nháp" })).toBeVisible();
    await expect(page.locator(".draft-item")).toHaveCount(3);
    for (const index of [1, 2]) {
      const item = page.locator(".draft-item").nth(index);
      for (const label of ["Calories (kcal)", "Protein (g)", "Carbs (g)", "Chất béo (g)"]) await item.getByLabel(label).fill("10");
    }
    await page.getByRole("button", { name: "Thêm món" }).click();
    await page.locator(".draft-item").nth(3).getByRole("button", { name: /^Bỏ món/ }).click();
    await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
    await expect(page).toHaveURL(/\/history\?date=/);
    await expect(page.locator(".summary-strip")).toContainText("245");
  });

  test("giọng nói báo cần HTTPS, gợi ý dùng micro bàn phím, không kẹt trạng thái", async ({ page }) => {
    await fakeSpeech(page, "deny");
    await signUp(page);
    await page.goto("/add-meal");
    await expect(page.getByText("nút Nói không dùng được", { exact: false })).toBeVisible();
    const speak = page.getByRole("button", { name: "Nói" });
    await expect(speak).toBeEnabled();
    await speak.click();
    const message = page.locator(".quick-capture [role=alert]");
    await expect(message).toContainText("Trình duyệt chỉ cho dùng micro trên HTTPS");
    await expect(message).toContainText("micro trên bàn phím");
    // Thông báo nằm ngay dưới nút, nhìn thấy được trên màn hình điện thoại.
    await expect(message).toBeInViewport();
    await expect(page.getByText("Đang nghe")).toHaveCount(0);
    await expect(speak).toBeVisible();
    await page.getByLabel("Ghi chú thêm").fill("gõ tay vẫn được");
    await expect(page.getByLabel("Ghi chú thêm")).toHaveValue("gõ tay vẫn được");
  });
});

test.describe("giọng nói trên trang an toàn (localhost/HTTPS)", () => {
  test("nói điền chữ tiếng Việt vào ghi chú, sửa được trước khi gửi", async ({ page }) => {
    await fakeSpeech(page, "ok");
    await signUp(page);
    await page.goto("/add-meal");
    await page.getByLabel("Ghi chú thêm").fill("thêm rau");
    await page.getByRole("button", { name: "Nói" }).click();
    await expect(page.getByLabel("Ghi chú thêm")).toHaveValue("thêm rau 200g cơm tấm");
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__speechLang)).toBe("vi-VN");
    await page.getByRole("button", { name: "Dừng nói" }).click();
    await expect(page.getByRole("button", { name: "Nói" })).toBeVisible();
    await page.getByLabel("Ghi chú thêm").fill("250g cơm tấm");
    await page.getByRole("button", { name: "Tạo bản nháp" }).click();
    await expect(page.locator(".draft-item").first().getByLabel("Tên món")).toHaveValue("cơm tấm");
  });

  test("bị từ chối micro: báo lỗi rõ và nút trở lại trạng thái Nói", async ({ page }) => {
    await fakeSpeech(page, "deny");
    await signUp(page);
    await page.goto("/add-meal");
    await page.getByRole("button", { name: "Nói" }).click();
    await expect(page.getByText("Chưa có quyền dùng micro", { exact: false })).toBeVisible();
    await expect(page.locator(".quick-capture [role=alert]")).toBeInViewport();
    await expect(page.getByRole("button", { name: "Nói" })).toBeVisible();
    await expect(page.getByText("Đang nghe")).toHaveCount(0);
  });

  test("trình duyệt không hỗ trợ: nút Nói bị tắt và có hướng dẫn gõ", async ({ page }) => {
    await fakeSpeech(page, "none");
    await signUp(page);
    await page.goto("/add-meal");
    await expect(page.getByText("chưa hỗ trợ nói thành chữ", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Nói" }).click();
    await expect(page.locator(".quick-capture [role=alert]")).toContainText("chưa hỗ trợ nhập bằng giọng nói");
  });
});

test.describe("điện thoại qua HTTPS trong mạng LAN (npm run dev:https)", () => {
  // Cổng HTTPS (scripts/dev-https.mjs) với chứng chỉ tự ký; ignoreHTTPSErrors giống người dùng bấm "Tiếp tục".
  test.use({ baseURL: "https://tcgm.test:3543", ignoreHTTPSErrors: true });

  test("trang được coi là an toàn: nút Nói điền chữ, ảnh và lưu bữa hoạt động", async ({ page }) => {
    await fakeSpeech(page, "ok");
    await signUp(page);
    expect(await page.evaluate(() => window.isSecureContext && location.protocol)).toBe("https:");
    await page.goto("/add-meal");
    await expect(page.getByText("nút Nói không dùng được", { exact: false })).toHaveCount(0);
    await page.getByRole("button", { name: "Nói" }).click();
    await expect(page.getByLabel("Ghi chú thêm")).toHaveValue("200g cơm tấm");
    await page.getByRole("button", { name: "Dừng nói" }).click();
    await page.locator(".quick-capture input[type=file][capture]").setInputFiles(photo);
    await expect(page.getByRole("img", { name: "Ảnh bữa ăn 1" })).toBeVisible();
    await page.getByRole("button", { name: "Tạo bản nháp" }).click();
    await expect(page.locator(".draft-item")).toHaveCount(2);
    const second = page.locator(".draft-item").nth(1);
    for (const label of ["Calories (kcal)", "Protein (g)", "Carbs (g)", "Chất béo (g)"]) await second.getByLabel(label).fill("20");
    await page.getByRole("button", { name: "Xác nhận lưu bữa" }).click();
    await expect(page).toHaveURL(/\/history\?date=/);
    await expect(page.locator(".summary-strip")).toContainText("320");
  });
});
