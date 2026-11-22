# tcgm — Calories Tracker

Ứng dụng tiếng Việt, ưu tiên điện thoại. Đã có **G1 (khung giao diện)**, **G2 (đăng nhập, database Supabase, RLS)** và **G2b (Ghi nhanh bằng AI + nhật ký thật)**; chưa phải MVP hoàn chỉnh.

## Chạy local

Yêu cầu Node.js >= 20.9 (đang phát triển với Node 24), npm, Docker Desktop (cho Supabase local).

```powershell
npm ci
npx supabase start
```

Lần đầu `supabase start` tải image Docker (vài phút) và áp migration trong `supabase/migrations`. Dự án dùng dải cổng 554xx (API `127.0.0.1:55421`, Studio `127.0.0.1:55423`) để không đụng dự án Supabase local khác ở 543xx. Tạo `.env.local` (Git bỏ qua) từ thông tin `npx supabase status -o env`:

```text
NEXT_PUBLIC_SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY>
```

Không đặt `SECRET_KEY`/`SERVICE_ROLE_KEY` vào `.env.local` hay code app.

AI "Ghi nhanh" (chỉ phía server):

```text
OPENAI_API_KEY=<key từ platform.openai.com>
OPENAI_MODEL=<model hỗ trợ ảnh + structured output>
AI_DAILY_LIMIT=30
```

Chưa có key thì đặt `AI_PROVIDER=mock` để dùng AI giả lập (không gọi mạng); xóa dòng đó khi đã có key. Sau đó:

```powershell
npm run dev
```

Mở `http://127.0.0.1:3000`, tạo tài khoản bằng email + mật khẩu (Supabase local không cần xác nhận email). Dừng Supabase bằng `npx supabase stop`.

```powershell
npm run lint
npm run typecheck
npm run build
npm test
npm run test:db
npm run test:e2e
```

- `npm test`: unit test (Vitest, `tests/unit`): công thức mục tiêu, đọc số.
- `npm run test:db`: integration test database (`tests/db`), cần Supabase local đang chạy. Tạo hai tài khoản giả, kiểm tra RLS, tham chiếu chéo, RPC lưu bữa (transaction, idempotency, revision, quy đổi đơn vị), snapshot khi xóa món, mục tiêu theo ngày hiệu lực.
- `npm run test:e2e`: Playwright trên desktop và mô phỏng Pixel 7, cần Supabase local và `.env.local`. Test tự khởi động server riêng cổng 3100 nên không chạy được khi đang có một `next dev` khác trong thư mục. Máy local mặc định dùng Edge; khi biến `CI` được đặt dùng Chromium của Playwright (cần `npx playwright install chromium`); đặt `PLAYWRIGHT_CHANNEL` để chọn trình duyệt khác.
- `npm run gen:types`: sinh lại `src/lib/supabase/database.types.ts` sau khi đổi migration.

`npm start` cần chạy build trước. Lockfile được lưu trong Git; dùng npm ci để cài cùng phiên bản.

Scripts dev/build dùng Webpack vì Turbopack trên máy Windows hiện tại lỗi tạo tiến trình xử lý CSS; Webpack build đã chạy đạt. TypeScript dùng 5.9 vì typescript-eslint chưa hỗ trợ TypeScript 7. ESLint 9 tương thích nhưng npm báo hết hỗ trợ; cần đánh giá nâng cùng bộ plugin ở đợt bảo trì.

## Phạm vi hiện tại

- **Đăng nhập:** email/mật khẩu (Supabase Auth). Mọi trang theo dõi yêu cầu đăng nhập: `src/proxy.ts` làm mới session và chuyển khách tới `/login`; layout `(tracker)` kiểm tra lại bằng `getClaims()` phía server. Đăng xuất ở Cài đặt.
- **Database:** `profiles`, `goals`, `foods`, `meals`, `meal_items`, `weight_logs`, `mutation_requests` với ràng buộc, index và RLS theo `auth.uid()`. Bữa ăn chỉ ghi qua RPC `save_meal` (một transaction, chống trùng theo `request_id`, phát hiện sửa bản cũ bằng `revision`, tự tính tổng từ cơ sở × hệ số, không tự đổi ml↔g). Xóa món trong thư viện chỉ đặt `food_id` về null, giữ snapshot.
- **Hồ sơ và mục tiêu:** luồng thiết lập trên trang chủ lưu vào tài khoản qua RPC `save_profile_goal`; server tự tính lại mục tiêu từ hồ sơ. Mục tiêu có hiệu lực từ hôm nay theo múi giờ hồ sơ (mặc định Asia/Ho_Chi_Minh); lưu lại trong cùng ngày thì cập nhật phiên bản của ngày đó, ngày cũ giữ mục tiêu cũ. Cân nặng nhập trong hồ sơ ghi vào nhật ký cân nặng.
- Mức nạp dưới 1.200 kcal chỉ được hiện cho Duy trì/Tăng, kèm lưu ý hỏi chuyên gia; thâm hụt dưới ngưỡng bị chặn. Ô số chấp nhận "74,5" hoặc "74.5", từ chối dạng hàng nghìn "1.200".
- **Ghi nhanh (`/add-meal`):** chụp/chọn tối đa 4 ảnh (thu nhỏ còn cạnh 1600 px JPEG trên máy, ảnh không được lưu) + ghi chú gõ hoặc nói (Web Speech API `vi-VN`, chỉ xin micro khi bấm, sửa được trước khi gửi) → `POST /api/ai/quick-log` (cần đăng nhập; tối đa 3 MB/ảnh, 8 MB tổng, 1000 ký tự; HEIC báo đổi JPEG/PNG; trừ lượt qua RPC `consume_ai_quota`) → OpenAI Responses API với structured output (Zod), `store: false`, timeout 60 s, 1 lần thử lại → bản nháp nhiều món (gram, kcal, P/C/F nullable, giả định, cần kiểm tra). Editor chung: ô trống là chưa biết (bắt buộc bổ sung, không thành 0), đổi gram có nút "Tính lại theo gram", lưu qua `save_meal` với `request_id` cố định cho cùng nội dung. Nhập thủ công dùng cùng editor; Kho món và Quét nhãn hiển thị "sắp có".
- **Nhật ký và Dashboard** đọc bữa thật từ database theo `?date=`; Dashboard dùng mục tiêu có hiệu lực của ngày đang xem (ngày chưa có mục tiêu chỉ hiện tổng). Xóa bữa có hỏi xác nhận. Sửa bữa đã lưu chưa có (G4).
- **Vẫn là dữ liệu minh họa** (bộ nhớ phiên trang): Kho món, trang Cân nặng. Quét nhãn chưa có.

## Môi trường các giai đoạn sau

G6–G7 cần OpenAI key/model trong `.env.local` (chỉ phía server, không có tiền tố `NEXT_PUBLIC_`). Chưa có project Supabase cloud hay deploy Vercel; chỉ làm khi được giao.

## Làm việc giữa Codex và Claude

Đọc `AGENTS.md`, `docs/HANDOFF.md`, `PRD.md`, `CONTEXT.md`, `docs/PLAN.md`. Kế hoạch đã duyệt. Main là nhánh ổn định; mỗi giai đoạn dùng feature branch. Phải xin phép trước commit/push và review/test trước merge. Xem HANDOFF để biết kiểm tra nào thật sự đã chạy.
