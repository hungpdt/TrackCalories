# tcgm — Calories Tracker

Ứng dụng tiếng Việt, ưu tiên điện thoại. Hiện triển khai **G1: khung giao diện minh họa**, chưa phải MVP hoàn chỉnh.

## Chạy local

Yêu cầu Node.js >= 20.9 (đang phát triển với Node 24), npm. Từ thư mục dự án:

```powershell
npm ci
npm run dev
```

Mở `http://127.0.0.1:3000`. Không cần API key cho G1. Dừng bằng Ctrl+C.

```powershell
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` cần chạy build trước. Lockfile được lưu trong Git; dùng npm ci để cài cùng phiên bản. Cấu hình theo tài liệu chính thức [Next.js](https://nextjs.org/docs/app/getting-started/installation) và [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

Scripts dev/build dùng Webpack vì Turbopack trên máy Windows hiện tại lỗi tạo tiến trình xử lý CSS (kể cả ngoài sandbox); Webpack build đã chạy đạt. TypeScript dùng 5.9 vì bộ typescript-eslint hiện chưa hỗ trợ TypeScript 7. ESLint 9 tương thích với cấu hình hiện tại nhưng npm thông báo đã hết hỗ trợ; cần đánh giá nâng lên phiên bản được hỗ trợ cùng bộ plugin ở đợt bảo trì, không bỏ qua lỗi lint để nâng phiên bản.

## Phạm vi hiện tại

Trang chủ mở luồng thiết lập mới. Nhập số đo, vận động, mục tiêu và mức điều chỉnh theo tuần, sau đó nhập món quen và dị ứng tùy chọn. Kết quả là ước tính cho người lớn, có giải thích phép tính. Hồ sơ chỉ lưu trong trình duyệt sau khi xác nhận và có thể xóa trên trang chủ. Gợi ý ưu tiên món đã nhập, tạm ẩn khi có dị ứng.

Chạy `npx playwright test` để kiểm tra luồng thiết lập trên Edge desktop và mô phỏng Pixel 7. Test khởi động server riêng cổng 3100, yêu cầu Edge đã cài.

Sáu trang: `/`, `/add-meal`, `/history`, `/foods`, `/weight`, `/settings`. Có điều hướng desktop/mobile, loading/error/empty/404. Thử tìm món có/không dấu, yêu thích, chọn món vào editor, thêm/xóa món trong nhật ký mẫu, đổi ngày xem, nhập/xóa cân nặng mẫu và thay mục tiêu mẫu.

**Dữ liệu nhật ký minh họa chỉ giữ trong bộ nhớ của phiên trang** và quay về fixture khi tải lại. Ngày minh họa ban đầu là 22/11/2026 để các màn hình dùng cùng fixture.

Editor G1 nhập tổng dinh dưỡng cho lượng ăn mô tả, chưa quy đổi đơn vị/khẩu phần. Bản đồ cân nặng dùng SVG minh họa khoảng cách theo lần ghi. G3 sẽ bổ sung phép tính nghiệp vụ/decimal; G5 triển khai biểu đồ thật và mục tiêu có hiệu lực.

Auth, Supabase persistence/RLS, sửa bữa hoàn chỉnh, Food Library CRUD đầy đủ, scanner, AI và voice chưa kết nối. Các nút phương thức AI thông báo giai đoạn triển khai, không giả lập phân tích thành công. Không có upload ảnh, micro hoặc gửi dữ liệu đến server AI ở G1.

## Môi trường các giai đoạn sau

Sao chép `.env.example` thành `.env.local` rồi điền ở máy local, không đưa secrets vào chat/Git. G2 cần Supabase; G6–G7 cần OpenAI key/model. Tên biến public Supabase có thể ở browser nhưng phải đi cùng RLS; key OpenAI chỉ ở server. Chưa có migration để chạy, chưa có deploy Vercel; hướng dẫn sẽ bổ sung khi triển khai.

## Làm việc giữa Codex và Claude

Đọc `AGENTS.md`, `docs/HANDOFF.md`, `PRD.md`, `CONTEXT.md`, `docs/PLAN.md`. Kế hoạch đã duyệt. Main là nhánh ổn định; mỗi giai đoạn dùng feature branch. Phải xin phép trước commit/push và review/test trước merge. Xem HANDOFF để biết kiểm tra nào thật sự đã chạy.
