# Quy ước đóng góp — Calories Tracker

Áp dụng cho Codex, Claude và người phát triển. Đọc cùng [AGENTS.md](AGENTS.md), [PRD.md](PRD.md) và [kế hoạch](docs/PLAN.md). PRD quyết định hành vi sản phẩm; tài liệu này quy định cách viết code và quản lý thay đổi. Chỉ đạo mới nhất của người dùng được ưu tiên.

## 1. Branch và quyền thao tác Git

- `main` giữ bản ổn định. Tính năng làm trên `feature/<ten-tinh-nang>`, sửa lỗi trên `fix/<ten-loi>`; tên dùng tiếng Anh, chữ thường, dấu gạch nối. Dùng tên giai đoạn đã ghi ở PLAN mục 8 nếu phù hợp.
- Tạo branch mới từ `main` đã cập nhật sau khi phần phụ thuộc được merge. Nếu phải làm tiếp trên branch chưa merge, ghi rõ quan hệ phụ thuộc trong HANDOFF.
- Kiểm tra status/diff trước khi sửa hoặc chuyển branch. Không chuyển branch trong workspace đang được agent khác sử dụng; không stash/reset/clean hoặc ghi đè thay đổi của người khác để làm sạch repo.
- Hỏi người dùng trước mỗi commit và push, trừ đúng thao tác đã được cho phép rõ ràng. Có thể xin phép chung commit và push với danh sách thay đổi, branch và message cụ thể. Không coi quyền code là quyền commit/push.
- Chỉ merge vào `main` sau khi kiểm tra liên quan đạt và đã rà diff. Nếu merge tạo commit thì cần quyền tạo commit đó; push `main` cũng phải được cho phép. Không tự force-push, amend commit đã chia sẻ hoặc viết lại lịch sử.
- Stage file cụ thể, kiểm tra staged diff để tránh đưa thay đổi ngoài phạm vi vào commit. Không tự commit thay phần việc đang dở của agent khác.

## 2. Commit message

Dùng cấu trúc `type(scope): short description`. Viết mô tả tiếng Anh, ngắn, nêu thay đổi cụ thể; scope có thể bỏ khi thay đổi toàn dự án. Không cần emoji hoặc dấu chấm cuối tiêu đề.

| Type | Dùng khi |
| --- | --- |
| `feat` | Thêm chức năng |
| `fix` | Sửa hành vi sai |
| `refactor` | Đổi cấu trúc mà giữ hành vi |
| `test` | Thêm/sửa kiểm thử |
| `docs` | Thay đổi tài liệu |
| `chore` | Bảo trì, cấu hình, dependency và công cụ |

Ví dụ:

```text
feat(foods): add food search and favorites
fix(meals): preserve nutrition snapshots after food deletion
test(nutrition): cover serving conversions
docs: add contribution guidelines
chore: configure lint and typecheck
```

Một commit có một mục đích rõ ràng, có thể gồm code, test và tài liệu liên quan. Không tách máy móc từng file; không gộp tính năng với format/refactor không liên quan. Thay đổi phá tương thích dùng `!` sau type/scope và mô tả `BREAKING CHANGE:` trong body, kèm cách chuyển đổi nếu cần.

## 3. Ngôn ngữ, tên và format

- Tên biến, hàm, type và component bằng tiếng Anh. Giao diện, lỗi cho người dùng và tài liệu bàn giao bằng tiếng Việt có dấu, UTF-8.
- Biến/hàm dùng camelCase; component/type dùng PascalCase; file thông thường dùng kebab-case. Giữ tên file theo quy ước bắt buộc của framework như `page.tsx`, `layout.tsx`.
- Trường/bảng SQL dùng snake_case, nhất quán với schema. Type sinh từ database giữ nguyên tên trường; ánh xạ sang domain model ở biên khi cần.
- Dùng cấu hình formatter/linter trong repo làm chuẩn. Khi chưa có cấu hình, theo style hiện tại của file; không format toàn repo để sửa một lỗi nhỏ.
- Comment giải thích lý do, giới hạn hoặc quyết định khó thấy; tránh diễn giải lại từng dòng code. TODO cần mô tả việc thiếu và điều kiện xử lý.

## 4. TypeScript và tổ chức code

- Bật strict. Dùng type rõ ràng, `unknown` và validation cho dữ liệu ngoài ứng dụng; tránh `any`, ép kiểu hoặc bỏ qua lỗi TypeScript để làm build đạt.
- Chỉ thêm abstraction khi có nhu cầu thực tế. Hàm/component tập trung một trách nhiệm; không áp đặt giới hạn số dòng cứng.
- Theo cấu trúc PLAN: UI trong app/components/features; tính khẩu phần và ngày là hàm độc lập; truy cập dữ liệu và AI nằm ở lớp phù hợp. Không nhét truy vấn DB hay prompt AI vào component hiển thị.
- Mọi nguồn nhập bữa dùng chung editor, validation và đường lưu. Không nhân bản logic dinh dưỡng giữa scanner, text, ảnh và thủ công.
- Logic chỉ dùng server và secrets không được import vào client. Kiểm tra session/owner tại server và RLS; không tin owner hay tổng tính toán do client gửi.
- Giữ invariant của PRD: snapshot, decimal, đơn vị tương thích, dữ liệu thiếu khác 0, AI chỉ là bản nháp, transaction/idempotency và ngày hiệu lực.
- Không refactor, đổi dependency hoặc thay kiến trúc ngoài phạm vi nhiệm vụ nếu không cần thiết. Nếu phải thay để giải quyết vấn đề, giải thích lý do trong bàn giao.

## 5. Database, dependency và lỗi

- Thay đổi schema qua migration được lưu trong Git. Không sửa âm thầm migration đã áp dụng trên môi trường dùng chung; thêm migration mới và ghi cách chạy/ảnh hưởng dữ liệu.
- Kiểm tra constraints, RLS và quyền RPC cùng thay đổi schema. Không dùng service-role để tránh lỗi phân quyền.
- Giữ một package manager và lockfile theo repo; commit lockfile khi dependency thay đổi. Không đổi công cụ giữa các phiên chỉ do sở thích của agent.
- Không commit `.env` thật, token, log chứa dữ liệu cá nhân hoặc dữ liệu sức khỏe thật. `.env.example` chỉ có tên biến và giá trị mẫu an toàn.
- Hiển thị lỗi tiếng Việt có hành động khắc phục; giữ draft khi request thất bại. Không nuốt lỗi, giả báo thành công hoặc ghi bữa rỗng.

## 6. Kiểm tra trước khi bàn giao/merge

1. Rà diff, kiểm tra không có secrets, file sinh tự động không cần thiết hoặc thay đổi ngoài phạm vi.
2. Với code app: chạy script build, typecheck, lint trong package.json và test phù hợp với thay đổi. Không ghi lệnh test chưa tồn tại là đã chạy.
3. Với tính dinh dưỡng: test khẩu phần/override; với DB: test owner/RLS/snapshot/transaction; với UI: kiểm tra luồng tương tác và mobile/desktop liên quan. Ánh xạ theo A01–A15 của PRD.
4. Với thay đổi chỉ có tài liệu: rà nội dung, liên kết và `git diff --check`; không cần chạy build app nếu không ảnh hưởng code/cấu hình.
5. Ghi rõ kiểm tra đạt, thất bại hoặc chưa chạy cùng lý do. Mock không thay cho kiểm thử tích hợp thật; không đánh dấu hoàn thành phần chưa xác minh.
6. Cập nhật HANDOFF: thay đổi, branch, trạng thái commit, kiểm tra và bước tiếp theo. Chuẩn bị tóm tắt để xin phép commit/push đúng phạm vi.

## 7. Chuyển giữa Codex và Claude

Đọc HANDOFF và kiểm tra code thực tế trước khi tiếp tục. Không thay cách viết của agent trước chỉ vì sở thích; chỉ sửa khi có lỗi hoặc nhu cầu cụ thể. Không chạy đồng thời hai agent sửa cùng file/branch khi chưa phân công. Ghi checkpoint sau phần việc đáng kể, không đợi gần hết token.

Quy ước hiện được áp dụng qua review và hướng dẫn; tài liệu này không tự cài Git hooks, commitlint hay thay cấu hình CI.
