# Bàn giao hiện tại — Tcgm Calories Tracker

Cập nhật: 22/11/2026 (Asia/Bangkok). Agent: Codex.

## Trạng thái và phạm vi được phép

- Giai đoạn: chuẩn bị kế hoạch, chưa triển khai ứng dụng.
- Kế hoạch: ĐÃ SOẠN trong `docs/PLAN.md` / CHƯA ĐƯỢC DUYỆT.
- Chỉ đạo người dùng: đọc tài liệu, lập kế hoạch chia giai đoạn, đề xuất cấu trúc project và database; chưa code cho đến khi kế hoạch được chốt.
- Bổ sung: người dùng muốn chuyển qua Claude khi ChatGPT hết token; cần ngữ cảnh và việc tiếp theo trong file để cả hai tiếp quản được.
- Được phép hiện tại: đọc/kiểm tra và soạn tài liệu kế hoạch, bàn giao. Chưa được phép khởi tạo/code app.
- Được phép khởi tạo Git local và gắn remote theo yêu cầu mới. PHẢI HỎI trước commit và push; chưa được cho phép hai thao tác này.

## Đã hoàn thành

- Đọc toàn bộ `PRD.md` và `CONTEXT.md`, tóm tắt cho người dùng.
- Xác nhận hai file nằm ở thư mục gốc, không phải `docs/PRD.md`.
- Tạo `AGENTS.md` dùng chung, `CLAUDE.md` hướng dẫn Claude và file bàn giao này.
- Cập nhật CONTEXT để phản ánh quy trình chuyển giữa Codex và Claude.
- Soạn `docs/PLAN.md`: G0–G8, cấu trúc project, schema/constraints/RLS, RPC/idempotency, AI và ánh xạ kiểm thử A01–A15. Đây là đề xuất, chưa được duyệt.
- Khởi tạo Git nhánh `main`, gắn origin `https://github.com/hungpdt/TrackCalories.git`, thêm `.gitignore` bỏ secrets/build artifacts. Ghi quy tắc xin phép commit/push trong AGENTS và CONTEXT.

## Hiện trạng kỹ thuật

- Workspace: `D:\Hung\Health\TCGM`.
- Đã có `.git`, nhánh `main`, chưa có commit. Tài liệu và `.gitignore` chưa commit; chưa stage file.
- `git ls-remote --symref origin` thành công, không trả refs tại thời điểm kiểm tra: remote hiện chưa có nhánh/tag được công bố.
- Chưa khởi tạo Next.js, database, migration, tests hay deployment.
- Chưa xác minh credentials/dịch vụ Supabase, OpenAI, Vercel. Không cần credentials để lập kế hoạch.
- Đã có `docs/PLAN.md` ở trạng thái chờ duyệt; cập nhật AGENTS bỏ ghi chú file chưa tồn tại.
- Chưa có tác vụ triển khai đang dở; thay đổi của phiên này chỉ là tài liệu.

## Việc tiếp theo theo thứ tự

1. Đọc hướng dẫn và đối chiếu file thực tế; không lặp lại việc hỏi phạm vi MVP đã chốt.
   Nếu người dùng muốn lưu bộ tài liệu hiện tại lên GitHub, trình nội dung commit dự kiến và xin phép commit/push trước khi thực hiện. Chưa có lần push nào.
2. Người dùng xem `docs/PLAN.md` và các mặc định mục 1; điều chỉnh tài liệu nếu có phản hồi. Không soạn lại từ đầu.
3. Chờ chốt trước khi code; lời “ok tiếp theo làm gì nữa” là yêu cầu tiến hành bước lập kế hoạch, không phải duyệt bản kế hoạch chưa trình bày.
4. Khi nhận duyệt, ghi ngày/phạm vi vào PLAN và HANDOFF. Tiếp tục G1: kiểm tra phiên bản chính thức, khởi tạo và xây khung sáu màn hình; cập nhật checkpoint sau từng phần việc.

## Kiểm tra và hạn chế

- Đã dùng `rg --files --hidden -g '!.git' -g '!node_modules'` và `Get-ChildItem -Force` để kiểm tra thư mục; đọc hai tài liệu bằng UTF-8.
- Không chạy build/lint/typecheck/test app vì chưa có app.
- Không có blocker cho bước lập kế hoạch; chưa được duyệt triển khai là giới hạn phạm vi hiện tại.

## Prompt chuyển phiên

> Tiếp tục dự án Calories Tracker trong thư mục này. Đọc AGENTS.md, docs/HANDOFF.md, PRD.md, CONTEXT.md và docs/PLAN.md nếu có. Đối chiếu trạng thái thực tế, tiếp tục mục “Việc tiếp theo” trong phạm vi đã được duyệt; không làm lại phần đã xong. Nếu kế hoạch chưa chốt thì chỉ lập kế hoạch, chưa code. Cập nhật HANDOFF sau từng phần việc để Codex hoặc Claude tiếp quản được.
