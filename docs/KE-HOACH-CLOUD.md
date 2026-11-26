# Kế hoạch chuyển lên cloud (phương án B) — chưa làm; kế hoạch chi tiết ở cuối file (25/11/2026, chờ duyệt)

Người dùng duyệt ngày 24/11/2026: "đồng ý" phương án B để dữ liệu vẫn còn và app dùng được khi tắt PC. Dùng cá nhân.
Thực hiện **sau khi xong giao diện A + kho món** (phiên chính đang làm), để không đụng code đang sửa.
Mọi commit, push, merge, deploy vẫn phải xin phép người dùng ở từng bước. Không gửi key/mật khẩu trong chat.

## Lựa chọn

- Supabase Free (database + đăng nhập), vùng Singapore. Vercel Hobby (chạy app, HTTPS thật → nút Nói chạy trên điện thoại).
- Chi phí hosting 0đ. OpenAI vẫn tính phí theo lượt như hiện tại.
- Giá/giới hạn gói Free (khoảng 500 MB database, tạm dừng sau ~7 ngày không dùng, không sao lưu tự động) là theo hiểu biết cũ: kiểm tra lại supabase.com/pricing và vercel.com/pricing trước khi làm.
- Dữ liệu hiện tại trên máy chủ yếu là tài khoản test → bắt đầu mới trên cloud. Nếu muốn giữ bữa ăn thật, thêm bước chuyển dữ liệu.

## Checklist

### Người dùng tự làm
- [ ] Tạo tài khoản + project trên supabase.com (vùng Singapore), tự đặt và cất mật khẩu database.
- [ ] Tạo tài khoản vercel.com, đăng nhập bằng GitHub (repo `hungpdt/TrackCalories`).

### Claude/Codex làm (xin phép từng bước)
- [ ] Merge các nhánh `feature/auth-database`, `feature/ai-quick-log`, nhánh kho món vào `main`, push (cần review/test đạt trước).
- [ ] Đưa schema lên cloud: người dùng chạy trên máy `npx supabase link --project-ref <ref>` rồi `npx supabase db push` (tự gõ mật khẩu).
- [ ] Cấu hình Auth trên Supabase: Site URL và Redirect URL = địa chỉ Vercel; mẫu email xác nhận trỏ `/auth/confirm?token_hash={{ .TokenHash }}&type=email`; mật khẩu tối thiểu 8.
- [ ] Vercel: import repo, người dùng tự điền biến môi trường `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key), `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_DAILY_LIMIT`; không đặt `AI_PROVIDER`, `DEV_ORIGINS`. Kiểm tra thời gian chạy tối đa của function đủ cho AI (~50 s).
- [ ] Deploy, thử trên điện thoại qua `https://….vercel.app`: đăng ký, thiết lập mục tiêu, Nói, chụp ảnh, AI, lưu bữa, kho món.

### Bắt buộc về an toàn và dữ liệu
- [ ] **Chặn người lạ đăng ký** (tránh dùng AI bằng tiền của người dùng): sau khi người dùng tạo tài khoản, tắt sign-up trong Supabase (hoặc danh sách email được phép).
- [ ] **Sao lưu**: thêm lệnh `npm run backup` xuất toàn bộ dữ liệu ra file; người dùng chạy hằng tuần và cất lên Google Drive. Không đưa file sao lưu (dữ liệu sức khỏe) lên GitHub.
- [ ] Ghi chú cho người dùng: project Free bị tạm dừng nếu ~7 ngày không truy cập; bật lại trên supabase.com, dữ liệu không mất.
- [ ] Cập nhật README (cách deploy, sao lưu, khôi phục), PLAN và HANDOFF.

### Lưu ảnh món ăn — ĐÃ LÀM sớm (commit `9eb024f`, 24/11/2026)

Đã có: bucket riêng tư `meal-photos` (tạo bằng migration `20261124150000_meal_photos.sql`, nên `db push` tạo luôn trên cloud), cột `meals.photo_path`, xem ảnh qua route server `/api/meals/<id>/photo` (thay cho signed URL), xóa bữa xóa ảnh, test RLS hai tài khoản. Phần còn lại dưới đây (PRD/CONTEXT, theo dõi dung lượng, sao lưu ảnh) gộp vào kế hoạch chi tiết. Checklist gốc giữ để đối chiếu:

Hiện tại ảnh chỉ dùng để AI phân tích rồi bỏ, không lưu (PRD mục 3: "Ảnh dùng để phân tích, không lưu lâu dài mặc định"). Muốn xem lại ảnh trong Nhật ký/Kho món thì cần:

- [ ] Cập nhật PRD/CONTEXT: chuyển từ "không lưu ảnh" sang "lưu ảnh khi người dùng chọn", ghi rõ quyền riêng tư (ảnh là dữ liệu cá nhân) và cách xóa.
- [ ] Supabase Storage **bucket riêng tư** `meal-photos`; đường dẫn `<user_id>/<meal_id>/<uuid>.jpg`; chính sách Storage chỉ cho chủ tài khoản đọc/ghi/xóa thư mục `<user_id>/` của mình. Không dùng bucket công khai.
- [ ] Hiển thị bằng **signed URL** hết hạn ngắn (ví dụ 1 giờ), tạo phía server.
- [ ] Migration: bảng `meal_photos` (id, user_id, meal_id, storage_path, created_at; RLS theo chủ; composite FK cùng chủ với `meals`) hoặc cột ảnh đại diện trên `foods` cho Kho món.
- [ ] Upload sau khi bữa lưu thành công, dùng ảnh đã thu nhỏ trên điện thoại (~1600 px JPEG, ≤ 3 MB); tùy chọn "Lưu ảnh vào nhật ký" (mặc định tắt hoặc bật theo người dùng chọn).
- [ ] Xóa bữa/món → xóa luôn ảnh trong Storage (trigger hoặc server action), không để ảnh mồ côi.
- [ ] Theo dõi dung lượng: gói Free có giới hạn Storage (kiểm tra lại supabase.com/pricing); hiển thị/cảnh báo khi gần đầy; đưa ảnh vào `npm run backup` hoặc ghi rõ là không sao lưu ảnh.
- [ ] Test: hai tài khoản không xem được ảnh của nhau (kể cả đoán đường dẫn), signed URL hết hạn, xóa bữa xóa ảnh.

## Nhắc lại phương án A (để so sánh)

Chạy trên PC: tắt PC **không mất dữ liệu** (lưu trong Docker volume trên ổ cứng) nhưng điện thoại không dùng được khi PC tắt. Mất dữ liệu khi chạy `npx supabase db reset`, `supabase stop --no-backup`, xóa volume/gỡ Docker, hỏng ổ, cài lại máy.


## Kế hoạch triển khai chi tiết (Claude, 25/11/2026 — CHỜ NGƯỜI DÙNG DUYỆT)

Điều kiện đầu vào: agent review độc lập (code + bảo mật) cho `07b6d9f..feature/food-library` đã xong và các lỗi blocker/nên sửa đã sửa. Ước lượng: 1 phiên code (bước 1) + ~1 giờ thao tác cùng người dùng (bước 2–5).

### Bước 0 — Đưa code vào main (xin phép từng lệnh) — review độc lập xong, đã sửa (`9eefaaf`); chờ phép merge/push
- Lịch sử đang thẳng: `main` → auth-database → ai-quick-log → food-library. Merge bằng `git merge --ff-only feature/food-library` trên `main` (không tạo merge commit, không force-push), chạy lại lint/typecheck/unit/db trên main, rồi `git push origin main` và push 3 nhánh feature để lưu vết.

### Bước 1 — Code chuẩn bị (nhánh `feature/cloud-deploy`) — ĐÃ XONG 25/11/2026 (`18de68d`)
1. **Sao lưu `npm run backup`** (`scripts/backup.mjs`): đăng nhập bằng email/mật khẩu của chính người dùng (gõ trong terminal, không lưu), dùng URL + publishable key từ `.env.production.local` (gitignored). Xuất mọi bảng của người dùng (profiles, goals, meals, meal_items, foods, weight_logs) ra `backups/<ngày>/data.json` và tải ảnh `meal-photos` về `backups/<ngày>/photos/`. Không dùng service-role key. Thêm `backups/` vào `.gitignore`. Kèm `npm run restore` nhập lại vào tài khoản trống (qua RLS, giữ id) — test bằng DB local: backup → xóa dữ liệu user test → restore → so khớp.
2. **Khóa đăng ký**: biến `SIGNUP_ENABLED` (server). Khi `false`: ẩn nút/form Đăng ký và server action đăng ký trả lỗi. Lớp chặn thật vẫn là tắt "Allow new users to sign up" trên Supabase (bước 5); biến này chỉ để giao diện không mời người lạ.
3. **Kiểm tra env khi chạy production**: thiếu `OPENAI_API_KEY` mà `AI_PROVIDER` không phải `mock` → API AI trả lỗi rõ ràng "chưa cấu hình", không crash; chặn `AI_PROVIDER=mock` trên production.
4. **Dọn cấu hình dev**: `allowedDevOrigins`/`DEV_ORIGINS` chỉ dùng khi dev; `.env.example` liệt kê đủ biến cloud.
5. **Docs**: README (deploy, sao lưu, khôi phục, tạm dừng project Free), PRD/CONTEXT ghi "ảnh món được lưu riêng tư, xóa bữa xóa ảnh" (đổi so với mặc định cũ "không lưu ảnh").
6. Kiểm tra: lint, typecheck, unit, db, e2e (build + start, AI mock); test mới cho backup/restore và khóa đăng ký. Commit + review nhanh, xin phép merge.

### Bước 2 — Người dùng tự làm (Claude hướng dẫn từng màn hình)
- Kiểm tra lại giá/giới hạn gói Free của Supabase (database, Storage ~1 GB, tạm dừng khi không dùng) và Vercel Hobby (thời gian chạy function tối đa ≥ 60 s cho AI).
- Tạo project Supabase vùng Singapore (tự giữ mật khẩu database); tạo tài khoản Vercel bằng GitHub.

### Bước 3 — Đưa schema và cấu hình lên cloud — schema ĐÃ XONG 25/11/2026 (dùng `db push --remote`); còn cấu hình Auth
- Người dùng chạy `npx supabase link --project-ref <ref>` và `npx supabase db push` (tự gõ mật khẩu). Kiểm tra: đủ bảng, RLS bật, bucket `meal-photos` riêng tư.
- Auth: Site URL/Redirect URL = địa chỉ Vercel; mẫu email xác nhận → `/auth/confirm?token_hash={{ .TokenHash }}&type=email`; mật khẩu tối thiểu 8.
- Vercel: import repo `main`; người dùng tự điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_DAILY_LIMIT`, `SIGNUP_ENABLED=true` (tạm); không đặt `AI_PROVIDER`, `DEV_ORIGINS`.

### Bước 4 — Deploy và thử trên điện thoại (HTTPS thật)
Đăng ký, xác nhận email, thiết lập mục tiêu; Nói (micro chạy được vì HTTPS); chụp ảnh → AI thật → lưu → ảnh hiện trong thẻ và trang chi tiết; sửa thành phần; quẹt xóa; kéo tuần; Tiến độ; kho món; cân nặng. Lần đầu dùng OpenAI thật: ghi lại độ chính xác và thời gian phản hồi vào HANDOFF.

### Bước 5 — Khóa và sao lưu
- Tắt đăng ký trên Supabase + đặt `SIGNUP_ENABLED=false` trên Vercel, redeploy; thử đăng ký bằng email khác phải bị chặn.
- Chạy `npm run backup` lần đầu với cloud, người dùng cất thư mục lên Google Drive; nhắc chạy hằng tuần.
- Cập nhật HANDOFF/PLAN: địa chỉ app (không ghi key), trạng thái đã kiểm chứng/chưa.

### Rủi ro chính
- Dữ liệu local hiện tại không tự lên cloud: bắt đầu mới; muốn giữ thì dùng `backup` (local) → `restore` (cloud) — chính là bài test thật của công cụ sao lưu.
- Gói Free không có sao lưu tự động → phụ thuộc `npm run backup` của người dùng.
- Chi phí OpenAI: `AI_DAILY_LIMIT` giữ nguyên; khóa đăng ký là bắt buộc trước khi chia sẻ link.

## Sau cloud: tính năng tiếp theo (đề xuất, chưa lập kế hoạch chi tiết)
1. **G6 — Quét nhãn dinh dưỡng** (MVP, PRD A04–A06): chụp nhãn → AI đọc bảng (chọn cột 100 g / khẩu phần, chuyển kJ, ô thiếu để trống) → lưu vào Kho món qua editor chung. Cần OpenAI thật để kiểm chứng.
2. **Vận động** (PLAN 7a): cần người dùng chốt có cộng kcal vận động vào "còn lại" không và bổ sung PRD trước.
