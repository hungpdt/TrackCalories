# PRD — Tcgm Calories Tracker

Phiên bản: 1.0 hợp nhất • Ngày: 22/11/2026 • Trạng thái: yêu cầu để bàn giao triển khai, chưa phải ứng dụng đã xây dựng.

## 1. Mục tiêu và nguồn yêu cầu

Web app cá nhân bằng tiếng Việt, mobile-first, giúp ghi bữa ăn nhanh, theo dõi calories và protein/carbohydrate/fat (P/C/F), cân nặng và mục tiêu giảm mỡ, duy trì hoặc tăng cân/tăng cơ. Ưu tiên món Việt và món người dùng thường ăn. AI đưa ra ước tính có thể sửa; người dùng xác nhận trước khi ghi nhận.

Nguồn: cuộc chat “So sánh model và chọn model code app”, ID `6b026a40-e8dc-83ec-8701-eb1e7937f2cd`, và yêu cầu bàn giao hiện tại. Đã đọc toàn bộ nội dung mà công cụ đọc chat trả về (5 lượt, không có trang tiếp theo, không có tệp đính kèm). Các phần thiết kế chi tiết bổ sung trong tài liệu này là đề xuất triển khai, không phải lời người dùng đã xác nhận.

PRD này thay thế các bản v1.0/v1.1 rời rạc trong chat. Food Library và Nutrition Label Scanner thuộc MVP, không được đẩy sang giai đoạn 2 chỉ để giảm phạm vi. Không cam kết miễn phí dịch vụ: hosting/database có thể có hạn mức, OpenAI API có chi phí tùy sử dụng.

## 2. Phạm vi

| Hạng mục | MVP v1.0 |
| --- | --- |
| Đăng nhập và dữ liệu cá nhân | Supabase Auth, dữ liệu tách theo tài khoản |
| Nhập món | Thủ công, text với AI, ảnh món ăn với AI, voice thành text |
| Quét nhãn dinh dưỡng | 100g, 100ml, mỗi khẩu phần, cả gói |
| Chỉnh kết quả | Tên, nguyên liệu, khẩu phần, kcal và P/C/F trước khi lưu |
| Food Library | Tạo/đọc/sửa/xóa, tìm kiếm, yêu thích, gần đây, tái sử dụng |
| Nhật ký | Tạo/sửa/xóa bữa ăn và món, chọn ngày, snapshot dinh dưỡng |
| Mục tiêu | Loại mục tiêu, cân nặng đích, kcal và P/C/F hằng ngày |
| Cân nặng | Ghi/sửa/xóa, lịch sử và biểu đồ |
| Dashboard | Tổng kcal/P/C/F, còn lại/vượt mục tiêu, bữa trong ngày |

Giai đoạn 2: thực đơn AI 7 ngày, chat điều chỉnh bữa, dữ liệu món Việt chuyên biệt, phân tích tiến độ và gợi ý điều chỉnh mục tiêu. Kế hoạch tuần cần cho phép chỉnh/thay món và chỉ ghi vào nhật ký khi thực sự ăn. Chưa triển khai bảng/API/UI meal planning trong MVP.

Ngoài phạm vi MVP: cộng đồng, thương mại/thu phí, barcode, đồng bộ đồng hồ, chế độ offline đầy đủ, AI tự đổi mục tiêu hoặc tự ghi bữa không xác nhận.

## 3. Quyết định đã chốt và giả định

### Đã chốt từ yêu cầu

- Tiếng Việt, ưu tiên điện thoại và món Việt; bắt đầu bằng nhu cầu một người dùng.
- Đầy đủ text/ảnh/voice, kho thực phẩm và quét nhãn trong MVP.
- Có thể chỉnh kcal/P/C/F trước khi thêm món; chọn chỉ sửa bữa hiện tại hoặc cập nhật thư viện.
- Lịch sử phải giữ snapshot, không thay đổi theo chỉnh sửa thư viện hay kết quả AI mới.
- Next.js, TypeScript, Tailwind CSS, Supabase, OpenAI API, Vercel. Recharts được đề xuất trong chat cho biểu đồ.
- API key chỉ ở server; AI trả kết quả có cấu trúc và thể hiện giả định/độ không chắc chắn.

### Giả định triển khai đề xuất

- Web responsive; chưa cần native app. Next.js App Router; chọn phiên bản ổn định tương thích tại lúc khởi tạo, không tự cố định phiên bản cũ.
- Supabase email/password là cách đăng nhập mặc định; OAuth tùy chọn sau. Dù dùng cá nhân vẫn áp dụng phân quyền từng người dùng.
- Đơn vị metric: kg, cm, g, ml; khẩu phần tùy đặt tên như tô, chén, hộp. Múi giờ mặc định Asia/Ho_Chi_Minh và có thể chỉnh.
- Thiết lập lần đầu hỏi cân nặng, chiều cao, tuổi và giới tính dùng cho công thức, tỉ lệ mỡ tùy chọn, vận động, mục tiêu và mức điều chỉnh kcal/tuần. Người dùng xem, chỉnh và xác nhận mục tiêu ước tính. Mục tiêu gồm giảm cân, tăng cân, tăng cơ giảm mỡ và duy trì. Không lấy số đo từ cuộc chat khác làm giá trị thật.
- Hiện kết quả duy trì, mức nạp, thâm hụt/thặng dư theo ngày và tuần cùng gram protein, carb, fat. Ghi rõ công thức, giả định và giới hạn. Hỏi món thường ăn, món yêu thích và dị ứng. Gợi ý ưu tiên món quen, chỉ gợi ý món khi có cơ sở kiểm tra dị ứng hoặc khi người dùng không khai báo dị ứng.
- Một bản ghi cân nặng/ngày; nhập lại ngày đã có thì đề nghị cập nhật. Loại bữa: sáng, trưa, tối, phụ.
- Voice dùng Browser Speech Recognition khi khả dụng, có sửa transcript và nhập text dự phòng. Nếu cần voice trên trình duyệt không hỗ trợ, triển khai transcription phía server như phần mở rộng kỹ thuật, không giả vờ rằng voice luôn hoạt động.
- Ảnh dùng để phân tích. Cập nhật 24/11/2026 (người dùng yêu cầu): ảnh đầu tiên của bữa được lưu làm ảnh món trong storage riêng tư (`meal-photos`, chỉ chủ tài khoản đọc/ghi), xem qua route server có kiểm tra đăng nhập; xóa bữa xóa ảnh. Các ảnh khác chỉ dùng để phân tích rồi bỏ.
- Không có bộ dữ liệu phở/bún/cơm “chuẩn” đã được cấp. Dữ liệu demo phải ghi là minh họa/ước tính, không trộn vào thư viện thật tự động.

## 4. Luồng sử dụng và sáu màn hình

Thiết lập mục tiêu → xem và xác nhận kết quả → thêm bữa → xem/sửa bản nháp → xác nhận lưu → Dashboard cập nhật. Bản local cho phép thiết lập trước khi có Auth, lưu trong trình duyệt theo lựa chọn người dùng. Khi có Auth, gắn hồ sơ theo tài khoản và ghi nhận mục tiêu có ngày hiệu lực.

| Màn hình | Nội dung và hành động |
| --- | --- |
| Dashboard | Chọn ngày; kcal đã ăn, mục tiêu, còn lại/vượt; P/C/F theo gram; danh sách bữa; nút thêm nhanh |
| Add Meal | Chọn thư viện/thủ công/text/ảnh món/ảnh nhãn/voice; chọn ngày và loại bữa; sửa từng món và tổng; lưu |
| History | Nhật ký theo ngày, xem chi tiết, sửa/xóa bữa và từng món, giữ snapshot |
| Food Library | Tìm theo tên, yêu thích, gần đây; tạo/sửa/xóa; thêm nhanh vào bản nháp bữa |
| Weight | Nhập cân nặng theo ngày, sửa/xóa, biểu đồ tiến độ |
| Settings | Hồ sơ, đơn vị/múi giờ, mục tiêu và ngày hiệu lực, đăng xuất |

Food Library là màn hình thứ sáu bổ sung cho thiết kế năm màn hình ban đầu. Add Meal phải tìm món thư viện ngay tại chỗ. Điều hướng mobile có thể dùng các tab chính và nút thêm nổi bật; không bắt buộc nhét sáu tab vào thanh dưới.

### 4.1 Thư viện → bữa ăn

Tìm “Phở bò” → chọn bản ghi/khẩu phần → chỉnh lượng, kcal/P/C/F → xác nhận → tạo snapshot trong nhật ký. Mặc định thay đổi chỉ ảnh hưởng bữa này. Muốn sửa bản gốc phải chọn rõ “Cập nhật món trong thư viện”. Khi chưa có món: tạo thủ công hoặc lấy bản nháp AI, kiểm tra rồi lưu thư viện. Không tự lưu mọi kết quả AI vào thư viện.

### 4.2 Text, ảnh món và voice

- Text ví dụ: “200g cơm trắng, 150g ức gà áp chảo, 100g rau luộc”. Tách từng món/nguyên liệu, lượng, kcal/P/C/F, giả định như dầu/mỡ và trạng thái chín/sống nếu có liên quan.
- Ảnh món: chụp hoặc tải ảnh → AI nhận diện/ước lượng → người dùng bổ sung lượng, cách chế biến, nguyên liệu chưa rõ. Không tuyên bố suy ra chính xác trọng lượng từ ảnh.
- Voice: xin quyền micro khi nhấn ghi âm → hiển thị transcript có thể sửa → xử lý như text. Từ chối micro, không hỗ trợ hay lỗi nhận dạng phải có thông báo và ô nhập text.
- Cho phép thêm/bỏ món trong bản nháp. Chỉnh nguyên liệu không tự thay đổi dinh dưỡng một cách âm thầm: người dùng chọn tính lại hoặc sửa tay, rồi xác nhận.
- AI thất bại, hết hạn mức hoặc mất mạng: giữ phần đã nhập, cho nhập thủ công/thử lại; không tạo bữa rỗng hay trùng.

### 4.2a Màn "Ghi nhanh" (cập nhật 22/11/2026)

Quyết định từ chat phụ của người dùng ngày 22/11/2026 (người dùng chọn "làm cách 4"), được chuyển sang qua phiên Claude khác:

- Add Meal mặc định là một màn "Ghi nhanh": chụp/chọn một hoặc nhiều ảnh, cộng ô ghi chú gõ hoặc nói (gram, thành phần, cách nấu). Gửi một request tới server; AI trả bản nháp nhiều món (gram, kcal, P/C/F, giả định, món cần kiểm tra).
- Gram người dùng ghi/nói được ưu tiên hơn ước lượng từ ảnh. Voice dùng Browser Speech Recognition điền vào ô ghi chú, sửa được trước khi gửi.
- Bản nháp mở trong editor chung để sửa rồi mới lưu (qua `save_meal`). AI không tự lưu.
- Nhập thủ công là đường dự phòng; quét nhãn và kho món là lựa chọn phụ trên cùng màn.
- Giới hạn số lần gọi theo tài khoản, số ảnh và kích thước ảnh; key OpenAI chỉ ở server (`OPENAI_API_KEY`, `OPENAI_MODEL` trong `.env.local` do người dùng tự điền).

### 4.3 Scanner nhãn dinh dưỡng

1. Chụp/tải ảnh nhãn; phân biệt rõ với chế độ ảnh món ăn.
2. Trích tên sản phẩm/nhãn hiệu nếu đọc được, kcal (hoặc kJ), protein, total carbohydrate, total fat; nhận diện cột và cơ sở tính.
3. Hiển thị dữ liệu trích được, cơ sở 100g/100ml/khẩu phần/cả gói, kích thước khẩu phần, khối lượng cả gói nếu có và thông tin thiếu.
4. Người dùng chọn cột nếu có nhiều cột (ví dụ 100g và một khẩu phần), sửa dữ liệu, nhập lượng thực ăn/uống.
5. Tính dinh dưỡng tương ứng; xem trước → thêm vào bữa và/hoặc lưu thư viện theo lựa chọn rõ ràng.

Quy tắc bắt buộc:

- Không nhầm sugars với carbohydrate; saturated fat với total fat; sodium với bất kỳ macro nào.
- Không suy ra phần bị che/không đọc được. Trường thiếu là `null`, không phải 0; hiển thị cần bổ sung. MVP chỉ cho xác nhận lưu khi kcal và ba macro đã được người dùng hoàn thiện, kể cả khi giá trị thực là 0.
- Nhãn có nhiều cột không được ghép kcal ở cột này với macro ở cột khác. Phân biệt sản phẩm nguyên trạng và sau pha/chế biến nếu nhãn ghi rõ; nếu mơ hồ yêu cầu chọn/xác nhận.
- Không tự đổi ml sang g hay tô sang g khi chưa có hệ số được người dùng cung cấp. Có thể tính theo số khẩu phần nếu không biết khối lượng một khẩu phần.
- Nếu chỉ có kJ, có thể chuyển `kcal = kJ / 4.184` và ghi rõ là giá trị chuyển đổi. Nếu có kcal trên nhãn, ưu tiên kcal đó.
- Cả gói chỉ quy đổi theo gram/ml khi biết lượng cả gói. Nếu chỉ biết “một gói” thì hỗ trợ 0.5/1/2 gói theo đơn vị đó.

## 5. Mô hình khẩu phần và phép tính

Mỗi món có một cơ sở dinh dưỡng gồm `basis_type`, `basis_quantity`, `basis_unit`, kcal/P/C/F cho cơ sở đó; kèm mô tả khẩu phần nếu cần. Ví dụ 100 g, 100 ml, 1 tô, 1 khẩu phần 30 g, 1 gói 200 g. Tất cả số liệu dùng kiểu decimal trong DB, không dùng chuỗi đã định dạng để tính.

Nếu đơn vị tương thích: `hệ số = lượng ăn / lượng cơ sở`; mỗi chất và kcal thực ăn = giá trị cơ sở × hệ số. Nếu nhập số khẩu phần: hệ số chính là số khẩu phần. Mỗi thành phần dùng cùng hệ số.

- 60 kcal, P 5g, C 2.7g, F 3.2g trên 100ml; uống 250ml → 150 kcal, P 12.5g, C 6.75g, F 8g. Đây là ví dụ giả định, không phải dữ liệu sản phẩm thật.
- 120 kcal, P 3g, C 20g, F 3g trên khẩu phần 30g; ăn 45g → 180 kcal, P 4.5g, C 30g, F 4.5g.
- Nhãn cả gói 400 kcal và khối lượng 200g; ăn 50g → 100 kcal.

UI phải nói rõ ô đang sửa là “trên cơ sở” hay “cho lượng ăn hiện tại”. Đề xuất: chỉnh giá trị cơ sở và lượng ăn trong bản nháp, tính tổng trực tiếp; nếu người dùng ghi đè tổng, lưu dấu `manual_override`, không âm thầm nhân khẩu phần lần nữa. Khi đổi lượng sau ghi đè, yêu cầu xác nhận tính lại hoặc giữ tổng tùy chỉnh.

Tổng bữa = tổng các item snapshot; tổng ngày = tổng các bữa ngày đó. Không cộng đồng thời tổng bữa và item. Giữ độ chính xác tính toán, chỉ làm tròn khi hiển thị (kcal số nguyên, macro một chữ số thập phân). `4P + 4C + 9F` chỉ là kiểm tra/gợi ý, không ghi đè kcal nhãn hoặc kcal người dùng xác nhận vì nhãn có thể có chất xơ, polyol và làm tròn.

Giá trị dinh dưỡng phải hữu hạn và không âm; lượng ăn/cơ sở > 0. Cho phép số thập phân, xử lý dấu phẩy nhập tiếng Việt có kiểm soát. Cảnh báo số bất thường thay vì tự đổi số. Không ép kcal còn lại về 0 khi vượt: hiển thị rõ “Vượt X kcal”. Nếu chưa đặt mục tiêu, vẫn hiện tổng ăn nhưng không tạo mục tiêu giả.

## 6. Dữ liệu đề xuất

Chi tiết schema dưới đây là thiết kế đề xuất cho Codex; cần chuyển thành migration có constraints, indexes và RLS, không chỉ mock.

| Bảng | Trường chính |
| --- | --- |
| `profiles` | `id` → auth user, display_name tùy chọn, height_cm nullable, timezone, unit_system, created_at, updated_at |
| `goals` | id, user_id, goal_type (lose/maintain/gain), target_weight_kg nullable, daily_kcal, protein_g, carbs_g, fat_g, effective_from (date), created_at |
| `foods` | id, user_id, name, brand nullable, basis_type (per_100g/per_100ml/per_serving/per_package), basis_quantity, basis_unit, serving_label, serving_mass_g/serving_volume_ml nullable, kcal, protein_g, carbs_g, fat_g, source (manual/ai_estimate/label_scan), source_note, is_favorite, last_used_at, created_at, updated_at |
| `meals` | id, user_id, meal_date (local date), eaten_at (timestamptz), meal_type, note nullable, created_at, updated_at |
| `meal_items` | id, user_id, meal_id, food_id nullable, name_snapshot, basis/serving snapshot, consumed_quantity, consumed_unit, conversion snapshot nếu có, base_kcal/P/C/F snapshot, total_kcal, total_protein_g, total_carbs_g, total_fat_g, source_snapshot, assumptions_snapshot, manual_override, created_at, updated_at |
| `weight_logs` | id, user_id, logged_date, weight_kg, note nullable, created_at, updated_at; unique(user_id, logged_date) |

Ràng buộc và tính toàn vẹn:

- Tất cả bản ghi thuộc user đăng nhập. RLS SELECT/INSERT/UPDATE/DELETE theo `auth.uid()`; `WITH CHECK` cho ghi. Client không được tự chọn owner tùy ý.
- `meal_items` chỉ tham chiếu meal/food cùng owner; kiểm tra bằng composite FK hoặc transaction/server logic kèm ràng buộc thích hợp. Không chỉ dựa vào việc ẩn UI.
- Xóa food: đặt food_id về null, giữ mọi snapshot; không cascade xóa nhật ký. Xóa meal: xóa items của bữa đó trong cùng thao tác.
- Lưu bữa và items theo transaction/RPC để không có bữa lưu một nửa. Chống nhấn lưu hai lần bằng khóa UI và cơ chế idempotency phía server khi retry.
- Tổng bữa/ngày tính từ snapshot item; nếu cache tổng, phải đồng bộ trong transaction và có kiểm thử.
- Sửa meal item cập nhật snapshot của lần ăn đó; không sửa food trừ khi chọn riêng. Sửa/xóa food không làm thay đổi lịch sử.
- Goals có ngày hiệu lực. Chọn goal mới nhất có effective_from ≤ ngày xem; không dùng mục tiêu hôm nay để thay đổi ngày cũ. Unique(user_id, effective_from); sửa mục tiêu tạo phiên bản mới mặc định.
- meal_date là ngày người dùng chọn; lưu giờ UTC và múi giờ đúng. Không để đổi múi giờ hồ sơ âm thầm dời ngày của bữa cũ.
- Index theo user/date cho meals, goals, weight_logs; user/name cho foods. Tìm kiếm ưu tiên hỗ trợ tiếng Việt không phân biệt hoa thường, dấu nếu khả thi.

`meal_plans` chỉ là định hướng giai đoạn 2; chưa cần migration ở MVP.

## 7. Kiến trúc và AI

Frontend: Next.js + TypeScript + Tailwind, responsive. Supabase Postgres/Auth, Storage chỉ khi cần. Chart: Recharts. Hosting: Vercel. Tách hàm tính khẩu phần khỏi UI/AI để kiểm thử độc lập.

Đề xuất phân lớp: trang/components → dịch vụ nghiệp vụ và validation → Supabase; API AI chỉ chạy phía server. Text, ảnh món, ảnh nhãn có các chế độ/schema riêng; voice tạo transcript dùng chung text flow.

Hợp đồng AI đề xuất: `mode`, `items[]` với tên, cơ sở, lượng, đơn vị, kcal/P/C/F nullable, `source`, `assumptions[]`, `warnings[]`, `missing_fields[]`, `needs_confirmation`. Nhãn thêm basis/cột được chọn và dữ liệu khẩu phần. Trạng thái tin cậy định tính chỉ để gợi ý rà soát, không biến thành cam kết độ chính xác.

Validate JSON tại server bằng schema (ví dụ Zod), kiểm tra số hữu hạn/đơn vị/cơ sở. Kết quả sai schema không được ghi database. Nội dung ảnh/text là dữ liệu, không được dùng làm chỉ dẫn thay đổi hệ thống. AI chỉ trả bản nháp, không có quyền tự ghi/xóa dữ liệu.

Khi người dùng chọn food đã lưu, dùng dữ liệu thư viện; không gọi AI lại không cần thiết. Model qua biến môi trường, chọn model hỗ trợ input và structured output tại thời điểm triển khai. Không chốt model/giá từ chat cũ khi không có thông tin xác thực.

Giới hạn kích thước/định dạng ảnh, thời gian request, số lần retry và rate limit theo tài khoản phía server. Có xử lý ảnh HEIC hoặc thông báo đổi sang JPEG/PNG rõ ràng. Cho phép chụp/tải ảnh trên mobile. Giới hạn cụ thể cần ghi trong README sau khi chọn nhà cung cấp và môi trường.

## 8. Bảo mật, trải nghiệm và vận hành

- Không đưa OpenAI key hoặc Supabase service-role key vào bundle trình duyệt. Supabase public/anon key chỉ dùng cùng RLS. Không commit `.env` thật; cung cấp `.env.example` không có secret.
- Kiểm tra session ở server trước mọi API AI; route AI và thao tác dữ liệu không được truy cập chéo tài khoản.
- Không log ảnh, voice, thông tin sức khỏe hoặc token mặc định. Thông báo ngắn trong flow AI rằng dữ liệu nhập sẽ được gửi để xử lý; chỉ xin quyền camera/micro khi dùng.
- Có trạng thái loading, empty, lỗi và retry; giữ bản nháp khi lỗi. Nút, label và thông báo tiếng Việt; thao tác được bằng bàn phím; không chỉ dùng màu phân biệt thiếu/vượt mục tiêu.
- Dashboard phản hồi ngay sau lưu, đối soát với server; reload không mất dữ liệu. Không hứa tính năng offline chưa xây dựng.
- Dữ liệu AI được gắn “Ước tính”; dữ liệu nhãn ghi nguồn nhãn, vẫn cần người dùng kiểm tra. Đây là công cụ ghi nhận cá nhân, không tự đưa phác đồ hay lời khuyên điều trị.

## 9. Thứ tự triển khai cho Codex

1. Đọc CONTEXT.md và PRD.md, kiểm tra repository thực tế, lập kế hoạch/cấu trúc/schema. Chưa tự viết app trong nhiệm vụ tạo tài liệu này.
2. Khởi tạo Next.js/TypeScript/Tailwind; sáu màn hình và navigation bằng mock có ghi rõ. Chuẩn bị README và env example.
3. Supabase Auth, migrations, RLS, dữ liệu hồ sơ/mục tiêu và nền tảng test.
4. Food Library CRUD/tìm kiếm/yêu thích/gần đây; tính khẩu phần và chỉnh dinh dưỡng.
5. Meal Logging thủ công/thư viện, snapshot, History, sửa/xóa và transaction.
6. Dashboard, Goals và Weight với dữ liệu thật, ngày/múi giờ đúng.
7. Nutrition Label Scanner, review và lưu có xác nhận.
8. AI text và ảnh món Việt; dùng cùng editor bản nháp, không tạo luồng lưu riêng bỏ qua validation.
9. Voice → transcript có thể sửa → text pipeline; fallback rõ ràng.
10. Kiểm thử các tiêu chí dưới đây, hoàn thiện README và chuẩn bị cấu hình Vercel. Chỉ triển khai lên tài khoản thật khi được người dùng giao triển khai; không tự tạo chi phí hay công bố ứng dụng trong nhiệm vụ tài liệu.

Các bước là thứ tự phát triển, không phải lý do loại scanner/ảnh/voice khỏi MVP.

Cập nhật 22/11/2026: người dùng đưa màn "Ghi nhanh" (bước 8–9, ảnh + ghi chú + voice trong một request) cùng lưu nhật ký tối thiểu lên ngay sau bước 3, trước Food Library, biểu đồ và scanner. Xem mục 4.2a.

## 10. Tiêu chí nghiệm thu và kiểm thử

| Mã | Tình huống và kết quả bắt buộc |
| --- | --- |
| A01 | Tạo Phở bò thủ công, tìm lại, đánh dấu yêu thích, thêm nhiều khẩu phần; kcal/P/C/F tính đúng |
| A02 | Sửa macro trước khi thêm chỉ ảnh hưởng bữa mặc định; chọn cập nhật thư viện mới sửa food |
| A03 | Sửa/xóa food sau khi có nhật ký không đổi tên/khẩu phần/dinh dưỡng snapshot cũ |
| A04 | Nhãn 100ml và uống 250ml ra đúng ví dụ mục 5; kiểm thử tương tự 100g, serving và cả gói |
| A05 | Nhãn thiếu macro/cơ sở/mờ để null và chờ bổ sung; không tự điền 0; cột dữ liệu không bị trộn |
| A06 | Không dùng sugar thay carb hay saturated fat thay total fat; kJ chuyển đúng; kcal nhãn không bị công thức 4/4/9 ghi đè |
| A07 | Không đổi ml↔g hoặc tô↔g khi chưa biết hệ số; thay lượng sau manual override được xử lý minh bạch |
| A08 | Text, ảnh món và voice đều tạo bản nháp có thể sửa trước lưu; AI lỗi vẫn nhập thủ công được |
| A09 | Tạo/sửa/xóa bữa cập nhật tổng Dashboard/History đúng; retry hoặc bấm lưu hai lần không tạo bản ghi trùng |
| A10 | Đăng xuất/đăng nhập lại dữ liệu còn; user B không đọc/sửa/xóa dữ liệu hoặc tham chiếu food/meal của user A |
| A11 | Ghi/sửa/xóa cân nặng, biểu đồ đổi đúng; ngày trùng xử lý rõ; mục tiêu mới không thay ngày lịch sử |
| A12 | Ghi bữa gần nửa đêm, xem ngày cũ và đổi múi giờ không mất hoặc đếm đôi bữa |
| A13 | Thiếu quyền micro/camera, trình duyệt không hỗ trợ voice, timeout và hạn mức AI có thông báo/fallback rõ |
| A14 | API key không nằm trong client bundle/repository; API AI yêu cầu session và áp dụng giới hạn |
| A15 | Dùng được trên màn hình điện thoại và desktop; nhãn tiếng Việt, loading/empty/error đầy đủ |

Unit tests: phép tính khẩu phần, validation, rounding, ngày và mục tiêu hiệu lực. Integration tests: quyền truy cập, transaction, snapshot, sửa/xóa và retry. E2E: các luồng thêm từ thư viện, scanner, text/ảnh/voice (mock AI trong CI, thử thực tế có kiểm soát khi có credentials). Không tuyên bố AI thật đã được kiểm thử khi chỉ có mock.

Hoàn thành MVP khi mọi hạng mục MVP và tiêu chí liên quan được nghiệm thu; build/typecheck/lint và các bài kiểm thử quan trọng chạy đạt; README có cách chạy local, migrations, env, kiểm thử và deploy. Nếu thiếu credentials hoặc còn hạn chế voice theo trình duyệt, báo chính xác phần chưa xác minh.
