# Hướng dẫn chung — Codex và Claude

## Khi bắt đầu hoặc tiếp tục phiên

1. Đọc `docs/HANDOFF.md` để biết trạng thái, phạm vi đã được duyệt và việc tiếp theo.
2. Đọc `PRD.md` (yêu cầu sản phẩm) và `CONTEXT.md` (bối cảnh, quyết định).
3. Đọc `docs/PLAN.md` nếu có, gồm kế hoạch và trạng thái phê duyệt.
   Đọc `CONTRIBUTING.md` để áp dụng quy ước code, branch, commit message và kiểm tra trước khi merge.
4. Kiểm tra file/code thực tế và Git status/diff nếu đã có Git. Handoff là ghi nhận phiên trước, không thay thế xác minh hiện trạng. Giữ nguyên thay đổi chưa commit của người dùng/agent khác.

Chỉ dẫn mới nhất của người dùng ưu tiên hơn tài liệu. Khi có thay đổi, cập nhật tài liệu liên quan. Không coi đề xuất là quyết định đã chốt. Không yêu cầu người dùng duyệt lại phần đã được duyệt rõ ràng và ghi nhận.

## Phân công vai trò tài liệu

- `PRD.md`: nguồn yêu cầu và tiêu chí nghiệm thu duy nhất.
- `CONTEXT.md`: bối cảnh, quyết định lâu dài và lý do.
- `docs/PLAN.md`: kế hoạch giai đoạn, cấu trúc project, schema, kiểm thử và trạng thái duyệt; tạo khi lập kế hoạch.
- `docs/HANDOFF.md`: trạng thái hiện tại và công việc tiếp theo; cập nhật trong quá trình làm.
- `CLAUDE.md`: điểm vào cho Claude, dẫn về các hướng dẫn chung này.
- `CONTRIBUTING.md`: quy ước code, Git, commit message, kiểm thử và review dùng chung.

## Quy tắc triển khai

- Git remote: `https://github.com/hungpdt/TrackCalories.git`. Người dùng yêu cầu phải hỏi trước khi commit và trước khi push. Chuẩn bị diff và tóm tắt nội dung cụ thể trước khi hỏi; chỉ thực hiện thao tác đã được cho phép. Không coi việc chốt kế hoạch/code là cho phép commit/push. Không tự force-push.
- Từ 22/11/2026, kế hoạch đã được người dùng duyệt triển khai. Làm trên feature branch riêng cho từng giai đoạn; main giữ bản ổn định. Kiểm tra đạt rồi mới merge; commit/push vẫn cần xin phép. Danh sách nhánh trong PLAN mục 8.
- Chưa code ứng dụng, khởi tạo project hay cài dependency cho đến khi người dùng chốt kế hoạch. Viết tài liệu kế hoạch/bàn giao được phép.
- Giữ Food Library, scanner, text/ảnh/voice trong MVP; thực đơn tuần ở giai đoạn 2.
- Dùng chung editor và hàm tính khẩu phần; nhật ký giữ snapshot; AI chỉ tạo bản nháp để người dùng xác nhận.
- Tuân thủ validation, transaction, idempotency, RLS và các tiêu chí A01–A15 trong PRD.
- Không ghi secrets, ảnh cá nhân hoặc dữ liệu sức khỏe thật vào tài liệu bàn giao/log. Chỉ ghi tên biến môi trường và trạng thái cấu hình.
- Phân biệt mock với tích hợp thật, đã kiểm thử với chưa kiểm thử. Không tự deploy hoặc tạo chi phí ngoài phạm vi người dùng giao.
- Nếu chuyển giữa hai công cụ, dùng cùng thư mục/bản Git đã đồng bộ. Tránh hai agent cùng sửa một phần code trong cùng thời điểm nếu chưa phân công rõ.

## Cập nhật checkpoint

Cập nhật `docs/HANDOFF.md` sau mỗi phần việc đáng kể, khi đổi quyết định, gặp blocker và trước khi kết thúc/chuyển phiên. Không đợi gần hết token mới ghi.

Mỗi checkpoint cần nêu:
- Ngày, agent, giai đoạn và trạng thái duyệt (kèm chỉ đạo đã nhận nếu có).
- Đã hoàn thành gì, file nào thay đổi; phần đang dở và hành vi chưa chạy.
- Lệnh kiểm tra thực sự đã chạy, kết quả và phần chưa xác minh.
- Blocker, thông tin còn thiếu, công việc tiếp theo theo thứ tự cụ thể.
- Branch/commit và thay đổi chưa commit nếu có Git; không tự bịa mã commit.

Khi triển khai, ánh xạ tiến độ với giai đoạn trong PLAN và tiêu chí PRD; chỉ đánh dấu hoàn thành khi có bằng chứng. Ghi rõ trạng thái chưa chạy test, không coi thiếu kết quả là đạt.
