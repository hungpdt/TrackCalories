# Bàn giao hiện tại — Tcgm Calories Tracker

Cập nhật: 22/11/2026 (Asia/Bangkok). Agent: Claude.

## Trạng thái và quyền

- Kế hoạch đã được người dùng duyệt: “okay. sau đó hãy bắt đầu triển khai kế hoạch”. Không hỏi lại quyền code. Người dùng yêu cầu “code tiếp các tính năng”.
- G1 HOÀN TẤT và đã merge: `main` = `07b6d9f` (fast-forward từ `feature/app-shell`, đã push origin với sự cho phép của người dùng).
- G2 (Auth và database) ĐÃ CODE và ĐÃ COMMIT (người dùng cho phép) trên `feature/auth-database` (tạo từ `main` `07b6d9f`), commit `feat(auth-database): add Supabase auth, schema and RLS`. CHƯA push, CHƯA review độc lập. Phải hỏi trước mỗi commit/push; người dùng muốn agent riêng review trước push.
- Người dùng chọn Supabase local bằng Docker. Chưa có project Supabase cloud, chưa deploy Vercel.

## G2 — đã triển khai (chưa commit)

- Dependencies: `@supabase/supabase-js` 2.119, `@supabase/ssr` 0.12, `zod` 4.6, `server-only`; devDependency `supabase` CLI 3.2. `npm audit`: 0 lỗ hổng.
- `supabase/config.toml` (`supabase init`): project_id `tcgm`; tắt realtime/storage/edge runtime/analytics (MVP chưa dùng); **đổi toàn bộ cổng sang 554xx** vì máy có dự án Supabase local khác (`hu-tai-chinh`) đang chiếm 543xx. API `127.0.0.1:55421`, DB `55422`, Studio `55423`.
- Migration `supabase/migrations/20261122120000_init_schema.sql`:
  - Bảng `profiles` (thêm cột onboarding: height_cm, age_years, sex_for_formula, body_fat_pct, activity_level, frequent/favorite_foods, allergies, timezone có trigger kiểm tra), `goals` (goal_type gồm `recomposition`, weekly_adjustment_kcal, unique(user_id, effective_from)), `foods` (CHECK cơ sở khớp đơn vị), `meals` (revision), `meal_items` (snapshot đầy đủ, composite FK cùng owner, `ON DELETE SET NULL (food_id)`), `weight_logs` (unique ngày), `mutation_requests`.
  - Dinh dưỡng numeric, CHECK không âm + cận trên (cũng loại NaN). Index theo PLAN mục 4.
  - RLS mọi bảng theo `auth.uid()`; anon bị revoke; client không được insert/update `meals`/`meal_items` (chỉ qua RPC), không chạm `mutation_requests`. Trigger tạo hồ sơ khi đăng ký.
  - RPC `save_meal` (SECURITY DEFINER, search_path rỗng, owner từ auth.uid()): một transaction, claim `request_id` (retry cùng payload trả kết quả cũ, payload khác → `idempotency_conflict`, đồng thời chỉ tạo một), sửa cần `expected_revision` (`revision_conflict`), 1–50 item, kiểm food cùng owner, tự tính tổng = cơ sở × hệ số; chỉ quy đổi khi cùng đơn vị hoặc có serving_mass_g/serving_volume_ml, còn lại `incompatible_units` trừ khi `manual_override` (giữ tổng người dùng). Cập nhật `last_used_at`.
  - RPC `save_profile_goal` (SECURITY INVOKER): cập nhật hồ sơ, upsert mục tiêu ngày hiệu lực = hôm nay theo múi giờ hồ sơ, ghi cân nặng ngày đó.
- `src/lib/supabase/`: `env.ts`, `server.ts` (`createSupabaseServerClient`, `requireUser` dùng `getClaims()`), `database.types.ts` (sinh bằng `npm run gen:types`).
- `src/proxy.ts` (Next 16 thay middleware): làm mới session, khách → `/login`, đã đăng nhập vào `/login` → `/`.
- Route: trang theo dõi chuyển vào `src/app/(tracker)/` với layout gọi `requireUser()`; root layout tối giản; `/login` (đăng nhập/tạo tài khoản, server actions + zod, thông báo lỗi không lộ tài khoản tồn tại); đăng xuất ở Cài đặt; sidebar hiện email.
- Hồ sơ/mục tiêu lưu database: `features/goals/queries.ts` (mục tiêu có hiệu lực hôm nay), `actions.ts` (server tính lại mục tiêu bằng `calculateTargets`, không tin số client), `profile-mapping.ts`. Bỏ `profile-store.ts` (localStorage) và nút "Xóa thông tin trên thiết bị". Cài đặt là server component, hiện ngày hiệu lực, email, múi giờ.
- Vẫn là mock: Dashboard nhật ký, Kho món, Nhật ký, Cân nặng, editor (G3–G5 chuyển sang DB).
- `.env.local` (Git bỏ qua) chứa URL + publishable key local. `.env.example`, README cập nhật hướng dẫn Supabase local và test.

## G2 — kiểm tra đã chạy (Claude, 22/11/2026)

- `npm run lint` PASS, `npm run typecheck` PASS, `npm test` 28/28 PASS, `npm run build` PASS (proxy + route động).
- `npm run test:db` 18/18 PASS (Supabase local): hồ sơ tự tạo và chỉ đọc của mình; anon không đọc/gọi RPC; B không đọc/sửa/xóa food của A; không insert với user_id người khác (foods, weight_logs); client không insert meals trực tiếp; CHECK âm/cơ sở lệch; cân nặng trùng ngày; timezone sai; A04 100 ml → 250 ml = 150/12,5/6,75/8; retry + payload khác; hai request đồng thời; rollback khi một item lỗi; bữa rỗng; ml↔g bị chặn và override giữ tổng; revision; B không dùng food/meal của A; xóa food giữ snapshot, xóa meal xóa item; save_profile_goal cập nhật cùng ngày và cô lập user.
- Playwright 12/12 PASS (desktop Edge + Pixel 7): khách bị chuyển `/login` và sai mật khẩu báo lỗi; thiết lập lưu vào tài khoản và reload còn; Dashboard/Cài đặt cùng mục tiêu, email hiển thị; đăng xuất → đăng nhập lại còn mục tiêu, tài khoản mới không thấy; editor số hàng nghìn; tăng cân/tăng cơ. Chạy bằng config tạm trỏ tới `next dev` có sẵn ở cổng 3000 (PID 30348, không do Claude mở; webServer 3100 không chạy được khi có dev server khác), config tạm đã xóa.
- Bundle `.next/static` và mã nguồn không chứa SECRET_KEY/SERVICE_ROLE_KEY local, `sb_secret_`, `service_role`, `OPENAI_API_KEY`.
- Ảnh Playwright trang đăng nhập và Cài đặt mobile: bố cục ổn. Cảnh báo hydration trong log dev là do Playwright chèn `caret-color` khi chụp ảnh trước hydrate, không phải lỗi app.
- CHƯA: review độc lập G2; thử trên điện thoại thật; Supabase cloud; luồng xác nhận email (local tắt confirmations).

## G1 — tóm tắt

- Next.js 16.4.6, React 19.3, TypeScript 5.9, Tailwind 4, Webpack (Turbopack lỗi CSS trên máy này). Sáu trang, điều hướng desktop/mobile (Cài đặt qua icon topbar trên mobile), loading/error/empty/404, AI/scanner/voice hiển thị “chưa kết nối”.
- Đã kiểm tra UI desktop/mobile, review độc lập, sửa theo review (ngưỡng 1200 kcal chỉ chặn thâm hụt, parser số chặt `parseDecimal`, Vitest unit, Playwright channel cấu hình được, `.gitignore` có `.claude/` và `next-env.d.ts`). Commit `8e9bd29`, `65fcc71`, `4178854`, `07b6d9f`.
- Lỗi nhỏ còn lại: xóa món mock không hỏi xác nhận; dropdown “Chọn món mẫu” trống khi mở từ `?food=`.

## Vấn đề môi trường và giới hạn

- Docker Desktop phải bật trước `npx supabase start`. Dự án `hu-tai-chinh` của người dùng tự chạy cùng Docker ở 543xx; không dừng nó.
- Git `core.autocrlf` đổi file sang CRLF khi checkout; thay thế chuỗi nhiều dòng bằng script cần xử lý `\r\n`.
- Một `next dev` khác (PID 30348) đang chạy ở cổng 3000 trong thư mục này; `npm run test:e2e` cần tắt nó hoặc dùng config trỏ 3000.
- TypeScript 5.9 vì typescript-eslint chưa hỗ trợ 7; ESLint 9 sắp hết hỗ trợ.

## Việc tiếp theo

0. Ưu tiên mới (chat phụ 22/11/2026, người dùng chọn "làm cách 4"): sau G2 làm G2b "Ghi nhanh" trên `feature/ai-quick-log` (PRD 4.2a, PLAN G2b), trước G3. Cần người dùng tự điền `OPENAI_API_KEY`/`OPENAI_MODEL` vào `.env.local`; chưa xác minh key là platform API.
1. Xin phép commit G2 trên `feature/auth-database` (đề xuất `feat(auth-database): add Supabase auth, schema and RLS`), chạy agent review độc lập, sửa theo review, rồi xin phép push và merge main.
2. G3 (sau G2b) trên `feature/food-library`: Food Library CRUD/tìm kiếm không dấu/yêu thích/gần đây với bảng `foods`; module tính khẩu phần decimal (`src/lib/nutrition`) dùng chung với editor và khớp logic hệ số của `save_meal`; editor override rõ ràng; A01/A07.
3. G4–G5 chuyển nhật ký, Dashboard, cân nặng sang database (RPC `save_meal` đã sẵn).

> Tiếp tục dự án Calories Tracker trong thư mục này. Đọc AGENTS.md, docs/HANDOFF.md, PRD.md, CONTEXT.md và docs/PLAN.md nếu có. Đối chiếu trạng thái thực tế, tiếp tục mục “Việc tiếp theo” trong phạm vi đã được duyệt; không làm lại phần đã xong. Cập nhật HANDOFF sau từng phần việc để Codex hoặc Claude tiếp quản được.
