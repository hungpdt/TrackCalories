# Kế hoạch chuyển lên cloud (phương án B) — chưa làm

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

### Sau khi lên cloud: lưu ảnh món ăn (người dùng yêu cầu 24/11/2026, chưa làm)

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
