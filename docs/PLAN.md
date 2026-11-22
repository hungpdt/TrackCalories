# Kế hoạch Calories Tracker

Ngày: 22/11/2026. Trạng thái: ĐÃ ĐƯỢC DUYỆT TRIỂN KHAI ngày 22/11/2026.
Nguồn yêu cầu: `../PRD.md`. Người dùng: “okay. sau đó hãy bắt đầu triển khai kế hoạch”, yêu cầu feature branch riêng và main ổn định. Được phép code; commit/push tiếp theo vẫn cần hỏi trước.

## 1. Phạm vi và lựa chọn đề xuất

Giữ đầy đủ MVP trong PRD: sáu màn hình, thư viện, nhật ký, mục tiêu/cân nặng, scanner và AI text/ảnh/voice. Thực đơn tuần ở giai đoạn 2; không tạo bảng meal_plans trong MVP.

Stack đã chốt: Next.js, TypeScript, Tailwind, Supabase, OpenAI API, Vercel. Đề xuất App Router, Recharts, Zod cho validation, thư viện decimal cho tính toán, Vitest cho unit và Playwright cho E2E. Kiểm tra phiên bản tương thích và tài liệu chính thức tại lúc khởi tạo; chưa khóa phiên bản hoặc model AI trong bản kế hoạch này.

Các mặc định đề nghị duyệt cùng kế hoạch:

- Web responsive ưu tiên điện thoại; đăng nhập email/password.
- kg/cm/g/ml, múi giờ mặc định Asia/Ho_Chi_Minh; ngày bữa ăn do người dùng chọn.
- Bốn loại bữa sáng/trưa/tối/phụ; một bản ghi cân nặng/ngày.
- Theo cập nhật 22/11/2026, bổ sung onboarding ngay trong G1: hồ sơ tự nhập, ước tính mức duy trì/nạp và macro, lưu sau xác nhận trên trình duyệt. G2/G5 chuyển sang hồ sơ theo tài khoản và mục tiêu theo ngày hiệu lực. Bổ sung cột/bảng hồ sơ theo schema khi triển khai migration.
- Voice dùng nhận dạng giọng nói của trình duyệt, sửa transcript rồi gửi như text. Có text fallback; nếu cần voice trên thiết bị không hỗ trợ thì bổ sung transcription server sau khi kiểm tra thiết bị và chi phí.
- Ảnh chỉ phục vụ phân tích, không lưu lâu dài mặc định.
- Chưa deploy trong phạm vi duyệt kế hoạch; deployment thực hiện khi người dùng giao.

## 2. Giai đoạn triển khai

Thực hiện tuần tự; mỗi giai đoạn cập nhật HANDOFF và báo kết quả. Các giai đoạn bên dưới đều thuộc MVP, không phải tách scanner/voice sang phiên bản sau.

| Giai đoạn | Công việc và đầu ra | Điều kiện hoàn thành |
| --- | --- | --- |
| G0 — Chốt thiết kế | Duyệt kế hoạch, giả định, schema; ghi rõ phạm vi cho phép | ĐÃ DUYỆT ngày 22/11/2026 |
| G1 — Khung giao diện | Khởi tạo project, sáu trang, điều hướng mobile, component form/card, loading/empty/error; mock có nhãn; README/env example | Chạy local, build/typecheck/lint đạt; kiểm tra mobile/desktop; phần giao diện A15 |
| G2 — Auth và database | Migrations, constraints/indexes/RLS, session server, hồ sơ, nền tảng test DB và RPC giao dịch | Đăng nhập/đăng xuất, dữ liệu thật; test hai tài khoản và liên kết chéo bị chặn; nền A10/A14. ĐÃ CODE 22/11/2026 trên feature/auth-database, chờ review/merge |
| G2b — Ghi nhanh AI (ưu tiên mới 22/11/2026) | Màn "Ghi nhanh": nhiều ảnh + ghi chú gõ/nói → một API server (OpenAI, structured output, Zod) → bản nháp nhiều món → editor chung → `save_meal`; nhật ký tối thiểu đọc từ database; giới hạn lượt gọi/ảnh; thủ công là dự phòng | A08/A13/A14 cho text/ảnh/voice; gram người dùng ưu tiên hơn ước lượng ảnh; không lưu khi chưa xác nhận; mock trong CI, thử thật khi có key. ĐÃ CODE 22/11/2026 trên feature/ai-quick-log (tách từ feature/auth-database), chưa thử OpenAI thật |
| G3 — Thư viện và khẩu phần | CRUD/tìm kiếm/yêu thích/gần đây; module tính decimal; editor dùng chung, override rõ ràng | A01/A07, unit test quy đổi và validation; dữ liệu tồn tại sau reload |
| G4 — Nhật ký | Thêm thủ công/thư viện, sửa/xóa bữa và từng món; snapshot; transaction, retry/idempotency | A02/A03/A09; không lưu nửa bữa hoặc tạo trùng; lịch sử độc lập thư viện |
| G5 — Dashboard, mục tiêu, cân nặng | Tổng theo ngày, thiếu/vượt mục tiêu, mục tiêu có hiệu lực, CRUD cân nặng và biểu đồ | A11/A12; tổng từ item đúng, không dời ngày cũ khi đổi múi giờ |
| G6 — Scanner | API ảnh nhãn, chọn cột/cơ sở, dữ liệu thiếu, chuyển kJ, review và lưu qua editor chung | A04–A06; fixture nhãn nhiều cột/mờ; kiểm tra thật khi có key |
| G7 — AI text/ảnh và voice (phần lớn chuyển lên G2b; còn lại hoàn thiện/fallback) | API phân tích riêng từng chế độ; transcript có thể sửa; timeout/rate limit/fallback | A08/A13/A14; không có đường lưu bỏ qua xác nhận; mock CI và thử thật được báo riêng |
| G8 — Nghiệm thu | Rà A01–A15, kiểm thử toàn luồng, accessibility cơ bản, README setup/deploy | Build/typecheck/lint và test quan trọng đạt; ghi rõ phần chưa kiểm chứng; chỉ deploy khi được giao |

## 3. Cấu trúc project dự kiến

```text
src/
  app/
    (auth)/login/
    (tracker)/                 # layout có session
      page.tsx                # dashboard
      add-meal/
      history/
      foods/
      weight/
      settings/
    api/ai/
      text/
      food-image/
      nutrition-label/
  components/
    ui/
    navigation/
  features/
    meals/                    # editor chung, draft, thao tác bữa
    foods/
    dashboard/
    goals/
    weight/
    capture/                  # ảnh, micro, transcript
  lib/
    nutrition/                # hàm thuần: decimal, quy đổi, override
    validation/               # schema draft khác schema được phép lưu
    dates/                    # ngày local, timezone, mục tiêu hiệu lực
    supabase/                 # browser/server client, types sinh từ DB
    ai/                       # server-only, schema/mode/provider
  server/
    services/                 # kiểm session, nghiệp vụ và RPC
    rate-limit/
supabase/
  migrations/
  tests/                      # constraints, RLS, giao dịch
tests/
  unit/
  integration/
  e2e/
  fixtures/                   # dữ liệu giả, không dùng thông tin cá nhân
docs/
  PLAN.md
  HANDOFF.md
PRD.md
CONTEXT.md
AGENTS.md
CLAUDE.md
README.md
.env.example
```

UI → validation/nghiệp vụ → Supabase/RPC. AI trả draft, không ghi DB. Mọi nguồn nhập đi qua một editor và cùng hợp đồng lưu. Logic tính khẩu phần không phụ thuộc React hoặc AI. Server tính lại tổng từ dữ liệu đã validate, ngoại trừ tổng override đã xác nhận.

## 4. Database đề xuất

ID dùng UUID; thời gian hệ thống dùng timestamptz; ngày nghiệp vụ dùng date. Dinh dưỡng/khẩu phần dùng numeric với độ chính xác đủ cho phép tính, không làm tròn ở từng bước; kcal hiển thị nguyên, macro một chữ số thập phân. Tất cả bảng nghiệp vụ có owner, timestamps phù hợp. Không lưu ảnh mặc định.

| Bảng | Trường chính và ràng buộc |
| --- | --- |
| profiles | id PK/FK auth.users; display_name?, height_cm?, timezone, unit_system, created_at, updated_at. Chiều cao nếu có phải > 0 |
| goals | id, user_id, goal_type lose/maintain/gain, target_weight_kg?, daily_kcal, protein_g, carbs_g, fat_g, effective_from, created_at. Unique(user_id,effective_from); cân nặng đích > 0, dinh dưỡng hữu hạn không âm |
| foods | id, user_id, name, brand?, basis_type, basis_quantity, basis_unit, serving_label?, serving_mass_g?, serving_volume_ml?, kcal, protein_g, carbs_g, fat_g, source, source_note?, is_favorite, last_used_at?, created_at, updated_at |
| meals | id, user_id, meal_date, eaten_at, meal_type, note?, revision, created_at, updated_at. revision phục vụ phát hiện ghi đè bản sửa cũ |
| meal_items | id, user_id, meal_id, food_id?, position, name_snapshot, basis_type/quantity/unit_snapshot, serving_label/mass/volume_snapshot?, consumed_quantity/unit, conversion_snapshot?, base_kcal/protein/carbs/fat_snapshot, total_kcal/protein/carbs/fat, source_snapshot, assumptions_snapshot, manual_override, created_at, updated_at |
| weight_logs | id, user_id, logged_date, weight_kg, note?, created_at, updated_at. Unique(user_id,logged_date), cân nặng hữu hạn > 0 |
| mutation_requests (kỹ thuật) | user_id, request_id, operation, payload_hash, result_json, created_at; PK(user_id,request_id). Giữ kết quả retry thao tác lưu, không chứa secrets |

Triển khai G2 (migration `20261122120000_init_schema.sql`): profiles thêm cột hồ sơ onboarding (height_cm, age_years, sex_for_formula, body_fat_pct, activity_level, món quen/yêu thích/dị ứng); goals thêm goal_type `recomposition` và weekly_adjustment_kcal; RPC `save_profile_goal` lưu hồ sơ + mục tiêu + cân nặng trong một transaction. Supabase local dùng cổng 554xx.

`mutation_requests` bổ sung cho yêu cầu idempotency, không phải tính năng sản phẩm mới. `result_json` chỉ lưu ID/revision/trạng thái cần trả lại. Trong MVP giữ bản ghi để retry không tái tạo bữa đã xóa; chưa tự dọn khi chưa có chính sách hết hạn rõ ràng.

### Khẩu phần và dữ liệu thiếu

- per_100g: cơ sở 100 g; per_100ml: 100 ml. per_serving/per_package: cơ sở một khẩu phần/gói, kèm khối lượng hoặc thể tích nếu biết.
- Số khẩu phần/gói có thể là thập phân. Chỉ đổi sang g/ml khi có hệ số cùng loại; tuyệt đối không tự suy ra ml↔g.
- basis_quantity và consumed_quantity > 0; kcal/P/C/F hữu hạn, >= 0; loại/đơn vị/source theo tập giá trị hợp lệ.
- Draft AI cho phép null và missing_fields. Bản ghi foods/meal_items chỉ nhận đủ bốn giá trị đã xác nhận; không dùng 0 thay dữ liệu thiếu.
- Snapshot giữ cơ sở, lượng, hệ số và nguồn để diễn giải lại kết quả. JSON chỉ dành cho ghi chú giả định/hệ số bổ sung, không thay các cột dinh dưỡng chính.
- manual_override=true lưu tổng người dùng xác nhận; đổi lượng phải chọn giữ tổng hoặc tính lại. Không nhân tổng override lần nữa.

### Quan hệ, quyền và xóa

- profiles liên kết auth.users; các bảng còn lại liên kết owner. meals 1–N meal_items; foods 1–N meal_items nhưng food_id nullable.
- Unique(user_id,id) trên meals/foods; composite FK từ meal_items đảm bảo meal và food thuộc cùng user.
- Xóa meal cascade items; xóa food chỉ đặt food_id=null, không thay user_id hay snapshot. Khi viết migration phải chọn cơ chế FK chỉ SET NULL cột food_id nếu phiên bản DB hỗ trợ, hoặc RPC/trigger transaction tương đương; test cả đường xóa trực tiếp được phép.
- RLS tất cả bảng: SELECT/DELETE theo auth.uid()=user_id (profiles dùng id); UPDATE có USING và WITH CHECK; INSERT có WITH CHECK. Không cho client đặt owner khác.
- Lưu meal/items qua RPC, không cho client ghi trực tiếp để bỏ qua invariant bữa có ít nhất một item. RPC lấy owner từ auth.uid(), kiểm tra session và tất cả tham chiếu. Nếu cần SECURITY DEFINER phải cố định search_path, schema-qualified objects, thu hồi quyền public/anon và kiểm owner tường minh.
- mutation_requests chỉ được ghi qua RPC; không cho client sửa payload hash/kết quả. Kiểm thử quyền truy cập cả RPC và bảng.
- Không dùng service-role để bỏ qua phân quyền cho request người dùng.

### Giao dịch và chống trùng

Một RPC lưu bữa nhận request_id, operation, payload và expected_revision khi sửa. Trong cùng transaction: kiểm owner → claim request_id → validate payload/hash → tạo/sửa meals và items → cập nhật food chỉ khi người dùng chọn → ghi kết quả. Bất kỳ bước nào lỗi phải rollback toàn bộ.

Retry cùng request_id và payload trả lại kết quả đã lưu; request_id trùng nhưng payload khác báo xung đột. Unique constraint xử lý cả hai request đến đồng thời; khóa UI chỉ là lớp hỗ trợ. Bản sửa có revision cũ báo xung đột, giữ draft để người dùng xử lý. Xóa item cuối phải xóa cả bữa hoặc bị chặn rõ ràng, không để bữa rỗng.

### Index, tổng và lịch sử

- meals(user_id,meal_date), meal_items(user_id,meal_id), goals(user_id,effective_from), weight_logs(user_id,logged_date), foods(user_id,name), foods(user_id,last_used_at).
- Tìm kiếm tên không phân biệt hoa thường; triển khai tìm kiếm bỏ dấu bằng biểu diễn tên đã chuẩn hóa với index phù hợp sau khi kiểm tra extension hỗ trợ. Không thay tên gốc người dùng.
- Không cache tổng bữa/ngày trong MVP: aggregate từ total_* của item snapshot, tránh cộng kép.
- Goal của ngày D = bản có effective_from lớn nhất không vượt D. Mặc định tạo phiên bản mới; trùng ngày cần xác nhận sửa phiên bản ngày đó. Chỉnh hồi tố phải thể hiện rõ ảnh hưởng.
- meal_date là ngày đã chọn, không tính lại khi đổi timezone hồ sơ. eaten_at lưu UTC, không thay thế meal_date để lọc nhật ký.

## 5. AI, bảo mật và vận hành

- Ba endpoint/schema riêng cho text, ảnh món, ảnh nhãn; voice tái sử dụng text. API yêu cầu session, validate input/output server, không log nội dung cá nhân.
- Model cấu hình bằng env phía server; chọn model hỗ trợ input/structured output lúc triển khai. Không giả định chi phí miễn phí.
- Rate limit theo tài khoản ở kho dùng chung bền vững, không chỉ biến trong bộ nhớ serverless. Chọn cơ chế Postgres hoặc dịch vụ phù hợp khi cấu hình; nếu dùng Postgres, bổ sung migration bảng bộ đếm kỹ thuật chỉ server/RPC được thao tác.
- Giới hạn file, định dạng, timeout/retry phải ghi trong README khi hiện thực. HEIC cần xử lý hoặc thông báo chuyển JPEG/PNG. Lỗi giữ draft, không tự lưu hoặc tự gọi retry vô hạn.
- Không cần Storage ở MVP với mặc định không giữ ảnh. Chỉ public Supabase key ở client; OpenAI và service-role không vào client/repo.
- G1 chưa cần credentials. G2 cần môi trường Supabase local hoặc project người dùng cấp; G6–G7 cần key để kiểm tra AI thật. Không yêu cầu gửi secrets trong chat.

## 6. Kiểm thử và tiêu chí bàn giao

| Nhóm | Kiểm tra | PRD |
| --- | --- | --- |
| Unit | Quy đổi 100g/100ml/serving/gói, kJ, số thập phân/dấu phẩy, null/0, override, rounding; ngày và goal hiệu lực | A01,A04–A07,A11,A12 |
| DB/integration | Hai users và tham chiếu chéo; snapshot khi sửa/xóa food; rollback khi một item lỗi; retry đồng thời, sửa revision cũ; CRUD weight | A02,A03,A09–A12,A14 |
| AI contract | Fixture nhiều cột, nhãn mờ, thiếu macro, sugar/saturated fat; JSON sai; timeout/quota | A05,A06,A08,A13 |
| E2E | Thư viện → editor → lưu → reload; sửa/xóa; scanner/text/ảnh/voice mock; quyền micro bị từ chối; mobile/desktop | A01–A03,A08–A11,A13,A15 |
| Kiểm tra thật | Ảnh nhãn/ảnh món/text với credentials; voice trên thiết bị mục tiêu; session API và giới hạn; rà client bundle/secrets | A04–A08,A13,A14 |

Mock AI trong CI không chứng minh AI thật hoạt động. Ghi rõ lệnh/kết quả và môi trường trong HANDOFF. Hoàn thành MVP chỉ khi đủ phạm vi và các tiêu chí liên quan đạt; thiếu credentials hoặc voice chưa kiểm trên thiết bị phải ghi là chưa xác minh.

## 7. Chốt kế hoạch và tiếp quản

Đã nhận duyệt triển khai ngày 22/11/2026, bắt đầu G1 trên `feature/app-shell`. Không hỏi lại phê duyệt kế hoạch. Commit/push phải xin phép cho nội dung cụ thể. Khi chuyển Codex/Claude, tiếp tục giai đoạn đang dở, đọc checkpoint và kiểm tra file thực tế.

## 8. Nhánh Git

`main` là nhánh ổn định. Tạo nhánh từ main đã cập nhật khi bắt đầu từng phần, tránh tạo trước nhiều nhánh từ nền cũ: `feature/app-shell`, `feature/auth-database`, `feature/ai-quick-log` (G2b), `feature/food-library`, `feature/meal-logging`, `feature/dashboard-goals-weight`, `feature/label-scanner`, `feature/ai-voice`, `feature/mvp-validation`. Mỗi nhánh phải đạt kiểm tra của giai đoạn rồi mới merge vào main. Trước commit và push trình phạm vi/diff, kết quả kiểm tra và hỏi người dùng. Không force-push.
