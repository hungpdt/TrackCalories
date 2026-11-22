# Ngữ cảnh dự án — Tcgm Calories Tracker

Ngày bàn giao: 22/11/2026. Tài liệu dành cho Codex hoặc lập trình viên tiếp tục công việc. Đọc cùng `PRD.md` tại cùng thư mục.

## 1. Người dùng muốn gì?

Một ứng dụng cá nhân tiếng Việt để ghi calories và protein/carb/fat, theo dõi cân nặng và mục tiêu tăng cơ giảm mỡ. Dùng chủ yếu trên điện thoại, ưu tiên món Việt. Cần ghi nhanh bằng text, ảnh hoặc voice nhưng vẫn được sửa số liệu trước khi lưu.

Yêu cầu bổ sung nổi bật của người dùng: có kho món như “Phở bò” với calories, fat, protein, carb, tự thêm/sửa món để lần sau chọn nhanh; chỉnh dinh dưỡng trước khi ghi bữa. Ngoài ảnh món ăn, phải chụp được nhãn nutrition của đồ đóng gói và tính theo lượng thực dùng.

## 2. Nguồn và diễn tiến quyết định

Nguồn chính: [So sánh model và chọn model code app](chatgpt-conversation://6b026a40-e8dc-83ec-8701-eb1e7937f2cd).

Đã đọc nguồn bằng công cụ đọc chat: trả về 5 lượt hoàn chỉnh, không có trang tiếp theo hoặc attachment. Tên chat có nhắc so sánh model nhưng phần nội dung được cung cấp không có quyết định model cụ thể; không được bịa thêm hoặc khẳng định đã đọc những lượt không được trả về.

1. Người dùng yêu cầu PRD: text/ảnh/voice, AI món Việt, calories/macro, cân nặng/mục tiêu và thực đơn tuần; muốn MVP/tương lai, luồng, màn hình, database, stack và checklist Codex.
2. Bản đầu đề xuất 5 màn hình và tách thực đơn 7 ngày sang tương lai.
3. Người dùng thêm kho thực phẩm tái sử dụng; bản bổ sung gọi v1.1, thêm Food Library thành màn hình thứ sáu và snapshot dinh dưỡng.
4. Người dùng hỏi vì sao không gộp v1.1 vào v1.0 và yêu cầu chụp nutrition; thống nhất PRD v1.0 hợp nhất, scanner trong MVP, thực đơn tuần giai đoạn 2.
5. Người dùng hỏi cách chuyển context sang Codex rồi yêu cầu tạo file tại `D:\Hung\Health\TCGM`. Chat cũ mới nói bàn giao, chưa xác nhận đã tạo file.
6. Nhiệm vụ hiện tại: tạo PRD.md và CONTEXT.md hoàn chỉnh trong thư mục trên và xác minh file; chưa yêu cầu xây dựng ứng dụng.

## 3. Quyết định phải giữ

- Một PRD v1.0 duy nhất làm nguồn yêu cầu sản phẩm; không giữ các bản v1.1 rời gây xung đột.
- MVP gồm Food Library CRUD/tìm kiếm/yêu thích/gần đây, text/voice/ảnh món, scanner nhãn, editor kcal/P/C/F và khẩu phần, nhật ký/snapshot, mục tiêu, cân nặng và Dashboard.
- Sáu màn hình: Dashboard, Add Meal, History, Food Library, Weight, Settings.
- Weekly meal planning thuộc giai đoạn 2, không xây trước các luồng ghi bữa cốt lõi.
- AI đưa bản nháp, người dùng xác nhận; số liệu ước tính phải được ghi rõ.
- Quét nhãn phải xác định đúng 100g/100ml/serving/cả gói và cột dữ liệu. Không thay carb bằng sugar hoặc total fat bằng saturated fat. Không đoán phần không đọc được.
- Snapshot bữa ăn độc lập với bản ghi thư viện. Chỉnh thư viện hoặc xóa món không thay lịch sử.
- Chỉnh trong lần ăn chỉ ảnh hưởng lần ăn mặc định; cập nhật thư viện cần lựa chọn riêng.
- Stack: Next.js/TypeScript/Tailwind, Supabase, OpenAI API, Vercel; Recharts cho biểu đồ theo đề xuất chat.
- API key ở server, dữ liệu cá nhân có RLS; miễn phí sử dụng cá nhân không có nghĩa mọi dịch vụ/API đều miễn phí.

## 4. Giả định, chưa phải yêu cầu đã được xác nhận

Các chi tiết sau được bổ sung để Codex có thể lập kế hoạch thực tế; xem PRD để biết đầy đủ:

- App Router, email/password Auth, metric, Asia/Ho_Chi_Minh mặc định, một weight log/ngày, bốn loại bữa.
- Người dùng nhập mục tiêu kcal/P/C/F; chưa xây công thức TDEE hay tự đổi mục tiêu bằng AI.
- Voice ưu tiên Browser Speech Recognition và text fallback; server transcription chỉ khi cần mở rộng hỗ trợ.
- Ảnh không giữ lâu dài mặc định; nếu giữ phải private. Không tự seed dữ liệu dinh dưỡng chưa có nguồn vào tài khoản thật.
- Schema chi tiết, validation, transaction/idempotency, phiên bản mục tiêu theo ngày và kế hoạch test là đề xuất kỹ thuật của tài liệu bàn giao.
- Chưa có chiều cao/cân nặng/mục tiêu cụ thể được chốt trong chat này. Không lấy thông tin fitness ở các cuộc chat khác để mặc định hồ sơ.
- Chưa có repository code, Supabase project, Vercel project, API key hoặc model cụ thể được xác minh trong nhiệm vụ này. Thư mục tồn tại không chứng minh app đã được khởi tạo.

Không cần hỏi lại những tính năng đã chốt. Chỉ hỏi khi thông tin thực sự ảnh hưởng quyết định không thể suy ra; ghi lại giả định có thể đổi. Kiểm tra SDK/model/giới hạn dịch vụ hiện hành lúc triển khai bằng tài liệu chính thức.

## 5. Hướng dẫn làm việc cho Codex

1. Đọc cả hai file, kiểm tra file và hướng dẫn trong repo thực tế trước khi sửa. Không giả định thư mục trống hoặc ghi đè code hiện có.
2. Khi mới nhận bàn giao, đưa kế hoạch theo giai đoạn, cấu trúc thư mục, schema và các giả định cần chốt. Hướng bàn giao trong chat là lập kế hoạch trước, chưa code cho tới khi người dùng giao triển khai/chốt kế hoạch. Nếu người dùng đã chỉ đạo triển khai rõ ràng thì tiếp tục theo chỉ đạo đó, không hỏi lại máy móc.
3. Thứ tự: nền tảng/Auth → Food Library → Meal Logging/History → Dashboard/Goals/Weight → Scanner → AI text/ảnh món → Voice → nghiệm thu/deploy khi được giao.
4. Xây editor dùng chung cho mọi nguồn nhập, hàm tính khẩu phần riêng, nguồn dữ liệu và snapshot rõ ràng. Đừng xây mỗi đầu vào một cách tính khác nhau.
5. Bắt đầu với mock để làm giao diện, rồi thay bằng Supabase thật; mock không được coi là hoàn thành tính năng lưu trữ hay tích hợp AI.
6. Dùng migrations có thể chạy lại theo quy trình chuẩn; `.env.example` không có secrets; README nói rõ setup local, Auth, DB/RLS, AI và deploy.
7. Tự kiểm thử phần đã làm; ưu tiên tests cho khẩu phần, snapshot, quyền truy cập, transaction và ngày. Báo riêng kết quả mock và kiểm thử thật.
8. Sau mỗi giai đoạn, báo chức năng đã chạy, cách kiểm tra và vấn đề còn lại bằng tiếng Việt dễ hiểu. Đừng báo “hoàn thành MVP” khi thiếu scanner, voice, persistence hoặc kiểm thử quyền dữ liệu.
9. Cập nhật PRD khi người dùng đổi phạm vi; giữ CONTEXT ghi quyết định và lý do, tránh tạo nhiều PRD cạnh tranh nhau.

Gợi ý cấu trúc khi lập kế hoạch (có thể điều chỉnh theo repo): `src/app`, `src/components`, `src/lib/nutrition`, `src/lib/validation`, `src/lib/supabase`, `src/lib/ai`, `supabase/migrations`, `tests`, `README.md`, `.env.example`.

## 6. Các lỗi cần tránh

- Tách Food Library hoặc scanner thành “v1.1 làm sau”.
- Chỉ ghi tổng bữa mà không có từng món và snapshot.
- Lấy live nutrition từ foods khi hiển thị bữa cũ.
- Nhân khẩu phần hai lần sau khi người dùng sửa tổng.
- Đổi ml sang g hoặc tô sang gram không có hệ số.
- Dùng 0 cho thông tin nhãn không đọc được; trộn nhiều cột nhãn.
- Ép kcal luôn bằng 4P + 4C + 9F hoặc trình bày AI như đo lường chính xác.
- Gửi API key tới trình duyệt; bỏ RLS vì “chỉ dùng một mình”.
- Tự ghi bữa từ AI, tạo bữa trùng khi retry, hoặc mất bản nháp khi request lỗi.
- Tự chọn mục tiêu sức khỏe từ thông tin không có trong yêu cầu.
- Coi hỗ trợ Speech Recognition là giống nhau trên mọi điện thoại.

## 7. Prompt mở đầu cho phiên Codex tiếp theo

> Đọc PRD.md và CONTEXT.md trong thư mục dự án. Kiểm tra repo hiện tại, tóm tắt phạm vi MVP v1.0, rồi lập kế hoạch theo giai đoạn, đề xuất cấu trúc project, schema Supabase/RLS và cách kiểm thử. Giữ Food Library, nutrition-label scanner, text/ảnh/voice trong MVP; thực đơn tuần là giai đoạn 2. Nêu rõ giả định còn lại, chưa code cho tới khi tôi yêu cầu triển khai.

## 8. Trạng thái bàn giao tài liệu ban đầu

Đầu ra của nhiệm vụ này chỉ gồm PRD.md và CONTEXT.md. Không có ứng dụng, migration thực thi, tài khoản dịch vụ, deployment hoặc kiểm thử app nào được tạo bởi nhiệm vụ viết tài liệu. Việc kiểm tra file tồn tại/nội dung được báo riêng trong phản hồi bàn giao.

## 9. Tiếp tục giữa Codex và Claude — cập nhật 22/11/2026

Người dùng muốn dùng cả Codex và Claude để tiếp tục code khi một công cụ hết token. Ngữ cảnh cần nằm trong repo, không phụ thuộc vào lịch sử chat riêng của công cụ.

- `AGENTS.md`: quy tắc làm việc chung và cập nhật checkpoint.
- `CLAUDE.md`: hướng dẫn đầu vào cho Claude, dẫn về quy tắc chung.
- `docs/HANDOFF.md`: trạng thái mới nhất, đã làm/đang dở, kết quả kiểm tra, giới hạn và việc tiếp theo.
- `docs/PLAN.md`: sẽ được tạo trong bước lập kế hoạch, ghi rõ đề xuất hay đã duyệt.

Yêu cầu hiện tại đã chuyển từ tạo tài liệu ban đầu sang lập kế hoạch triển khai; người dùng vẫn yêu cầu chưa code đến khi kế hoạch được chốt. Đã đọc và tóm tắt hai tài liệu gốc. Xem HANDOFF để biết tiến độ mới nhất, không dùng mục 8 như trạng thái hiện hành mãi về sau.

Khi bắt đầu phiên mới, dùng prompt chuyển phiên trong HANDOFF. Mỗi agent phải cập nhật checkpoint sau phần việc đáng kể và trước khi kết thúc; không chờ hết token mới bàn giao. Khi người dùng chốt kế hoạch, ghi lại phạm vi đã duyệt để agent sau không hỏi lại.

## 10. Repository và quyền commit/push — 22/11/2026

Người dùng cung cấp `https://github.com/hungpdt/TrackCalories.git` và cho phép khởi tạo Git local, gắn remote. Phải hỏi người dùng trước khi commit và push; có thể xin phép cả hai trong cùng một yêu cầu với nội dung cụ thể, nhưng không được tự suy ra quyền từ yêu cầu code. Quy tắc áp dụng cho cả Codex và Claude. Việc thiết lập Git không phải phê duyệt kế hoạch triển khai ứng dụng.
