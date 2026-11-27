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
# AI_ALLOWED_EMAILS=ban@example.com,nguoi-than@example.com  # để trống: ai đăng nhập cũng dùng AI
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

### Thử trên điện thoại cùng Wi-Fi

- `npm run dev:https` (khuyên dùng, có nút Nói): tạo chứng chỉ tự ký `certs/` (Git bỏ qua, bằng OpenSSL của Git for Windows, không cài gì vào hệ thống) cho localhost và IP LAN, chạy `next dev` ở 127.0.0.1:3000 và cổng HTTPS ở `https://<IP máy>:3443`. Điện thoại cảnh báo chứng chỉ: bấm Nâng cao → Tiếp tục. Dừng mọi `next dev` khác trong thư mục trước khi chạy.
- `npm run phone`: build rồi chạy bản production (`next start`) sau cổng HTTPS 3443: chuyển trang nhanh, không có chữ "Rendering…". Sửa code xong phải chạy lại lệnh này.
- `npm run dev:lan`: mở `http://<IP máy>:3000`; ảnh và AI dùng được nhưng trình duyệt không cho micro (nút Nói báo lý do, dùng micro bàn phím).
- IP LAN được phép trong `allowedDevOrigins` qua biến `DEV_ORIGINS` (dev:https tự thêm IP hiện tại).

`npm start` cần chạy build trước. Lockfile được lưu trong Git; dùng npm ci để cài cùng phiên bản.

Scripts dev/build dùng Webpack vì Turbopack trên máy Windows hiện tại lỗi tạo tiến trình xử lý CSS; Webpack build đã chạy đạt. TypeScript dùng 5.9 vì typescript-eslint chưa hỗ trợ TypeScript 7. ESLint 9 tương thích nhưng npm báo hết hỗ trợ; cần đánh giá nâng cùng bộ plugin ở đợt bảo trì.

## Phạm vi hiện tại

- **Đăng nhập:** email/mật khẩu (Supabase Auth). Mọi trang theo dõi yêu cầu đăng nhập: `src/proxy.ts` làm mới session và chuyển khách tới `/login`; layout `(tracker)` kiểm tra lại bằng `getClaims()` phía server. Đăng xuất ở Cài đặt.
- **Database:** `profiles`, `goals`, `foods`, `meals`, `meal_items`, `weight_logs`, `mutation_requests` với ràng buộc, index và RLS theo `auth.uid()`. Bữa ăn chỉ ghi qua RPC `save_meal` (một transaction, chống trùng theo `request_id`, phát hiện sửa bản cũ bằng `revision`, tự tính tổng từ cơ sở × hệ số, không tự đổi ml↔g). Xóa món trong thư viện chỉ đặt `food_id` về null, giữ snapshot.
- **Hồ sơ và mục tiêu:** luồng thiết lập trên trang chủ lưu vào tài khoản qua RPC `save_profile_goal`; server tự tính lại mục tiêu từ hồ sơ. Mục tiêu có hiệu lực từ hôm nay theo múi giờ hồ sơ (mặc định Asia/Ho_Chi_Minh); lưu lại trong cùng ngày thì cập nhật phiên bản của ngày đó, ngày cũ giữ mục tiêu cũ. Cân nặng nhập trong hồ sơ ghi vào nhật ký cân nặng.
- Mức nạp dưới 1.200 kcal chỉ được hiện cho Duy trì/Tăng, kèm lưu ý hỏi chuyên gia; thâm hụt dưới ngưỡng bị chặn. Ô số chấp nhận "74,5" hoặc "74.5", từ chối dạng hàng nghìn "1.200".
- **Ghi nhanh (`/add-meal`):** chụp/chọn tối đa 4 ảnh + ghi chú gõ hoặc nói → `POST /api/ai/quick-log` (cần đăng nhập, giới hạn lượt/ngày qua RPC `consume_ai_quota`) → OpenAI structured output → bản nháp nhiều món → editor chung → `save_meal`. Ảnh đầu tiên được lưu riêng tư làm ảnh món (bucket `meal-photos`, xem qua `/api/meals/<id>/photo`, xóa bữa xóa ảnh).
- **Trang chủ, chi tiết bữa, Tiến độ, Kho món, cân nặng:** dữ liệu thật từ database; sửa bữa đã lưu giữ nguyên món không đổi. Quét nhãn chưa có (G6).

## Sao lưu và khôi phục

Gói Supabase Free không tự sao lưu. Chạy hằng tuần và cất thư mục kết quả ở nơi an toàn (ví dụ Google Drive); **không đưa lên GitHub** (dữ liệu sức khỏe, `backups/` đã nằm trong `.gitignore`).

```powershell
npm run backup -- --env .env.production.local
```

- Đăng nhập bằng email/mật khẩu của chính bạn (gõ trong terminal, không lưu); chỉ dùng URL + publishable key trong file env, không cần service-role key.
- Kết quả: `backups/<ngày-giờ>/data.json` (hồ sơ, mục tiêu, kho món, bữa ăn, cân nặng) và `photos/`.
- Khôi phục vào một tài khoản **chưa có dữ liệu** (ví dụ chuyển từ máy lên cloud): `npm run restore -- backups/<thư-mục> --env .env.production.local`. Không có `--env` thì dùng `.env.local` (Supabase local).

## Triển khai cloud (Supabase + Vercel)

Checklist đầy đủ: `docs/KE-HOACH-CLOUD.md`. Tóm tắt:

1. Supabase: `npx supabase link --project-ref <ref>` rồi `npx supabase db push` (tạo bảng, RLS, bucket ảnh riêng tư). Auth: Site URL/Redirect URL = địa chỉ Vercel; mẫu email xác nhận trỏ `/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
2. Vercel: biến môi trường `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_DAILY_LIMIT`, `AI_ALLOWED_EMAILS` (danh sách email được dùng AI; để trống = mọi tài khoản), `SIGNUP_ENABLED`. Không đặt `AI_PROVIDER` (trên Vercel chế độ mock luôn bị bỏ qua) hay `DEV_ORIGINS`.
3. Sau khi tạo tài khoản của mình: tắt "Allow new users to sign up" trong Supabase Auth và đặt `SIGNUP_ENABLED=false` (ẩn nút Tạo tài khoản), redeploy.
4. Project Free bị tạm dừng sau khoảng một tuần không dùng: bật lại trên supabase.com, dữ liệu không mất.

## Môi trường các giai đoạn sau

G6–G7 cần OpenAI key/model trong `.env.local` hoặc biến môi trường Vercel (chỉ phía server, không có tiền tố `NEXT_PUBLIC_`).

## Làm việc giữa Codex và Claude

Đọc `AGENTS.md`, `docs/HANDOFF.md`, `PRD.md`, `CONTEXT.md`, `docs/PLAN.md`. Kế hoạch đã duyệt. Main là nhánh ổn định; mỗi giai đoạn dùng feature branch. Phải xin phép trước commit/push và review/test trước merge. Xem HANDOFF để biết kiểm tra nào thật sự đã chạy.
