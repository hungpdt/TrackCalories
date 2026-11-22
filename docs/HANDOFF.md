# Bàn giao hiện tại — Tcgm Calories Tracker

Cập nhật: 22/11/2026 (Asia/Bangkok). Agent: Codex; checkpoint kiểm tra UI bởi Claude cùng ngày.

## Trạng thái và quyền

- Kế hoạch đã được người dùng duyệt: “okay. sau đó hãy bắt đầu triển khai kế hoạch”. Không hỏi lại quyền code.
- Đang G1 trên `feature/app-shell`. Code khung đã viết, build/lint/typecheck đạt; chưa nghiệm thu visual/mobile trực tiếp nên chưa đánh dấu G1 hoàn tất.
- Main giữ bản ổn định. Commit tài liệu `18fbe4f` đã push origin/main với sự đồng ý của người dùng.
- Người dùng cho phép 2 commit trên `feature/app-shell` (22/11/2026, Claude thực hiện): `8e9bd29 docs: add contribution guidelines` và commit tiếp theo `feat(app-shell): add Vietnamese tracker preview` (code G1, tests, tài liệu). Xem `git log` để lấy mã commit thứ hai. `.claude/launch.json` cố ý không commit.
- CHƯA push, CHƯA merge main. Phải hỏi trước mỗi push/commit tiếp theo. Người dùng yêu cầu agent riêng test/review trước push.
- Các feature branch tiếp theo tạo khi bắt đầu giai đoạn, từ main sau khi phần phụ thuộc đã merge. Chưa tạo hàng loạt branch từ nền cũ.

## Đã triển khai

- Next.js 16.4.6, React 19.3.1, TypeScript 5.9, Tailwind 4; npm + lockfile; cấu hình strict/lint/build và env example.
- Sáu route: tổng quan, thêm bữa, nhật ký, kho món, cân nặng, cài đặt. Layout responsive, navigation, loading/error/empty/404.
- Mock trong React context: tìm món không dấu, yêu thích, chọn vào editor, thêm/xóa món nhật ký theo ngày, nhập/xóa cân nặng, đổi mục tiêu mẫu. Reload khôi phục fixture.
- AI/scanner/voice có trạng thái chưa kết nối; không xin micro/camera hoặc gửi dữ liệu. Mọi fixture là giả, có banner.
- Sửa lỗi thêm bữa ngày khác phải mở đúng ngày trên history?date=... theo review.
- Sửa cỡ chữ nhãn thường dùng lên >=14px theo review. Chưa visual verify overflow.
- README ghi cách chạy, giới hạn mock và cấu hình. CONTRIBUTING từ chat phụ được giữ nguyên.

## Kiểm tra đã chạy

- `npm run lint`: PASS, không warning sau sửa postcss config.
- `npm run typecheck`: PASS.
- `npm run build`: PASS với Webpack, tất cả sáu route được build.
- HTTP GET sáu route (gồm history?date=2026-11-20): tất cả 200, có banner Dữ liệu minh họa.
- `git diff --check`: PASS cho tracked changes. File mới chưa staged.
- Agent `review_app_shell` review độc lập: lint/typecheck/diff PASS, không thấy secret hoặc request AI. Finding TS7 không tương thích lint và ngày redirect đã sửa; chữ mobile đã nâng sau review.
- Browser UI (Claude, 22/11/2026, dev server `npm run dev`, cấu hình preview `.claude/launch.json` mới): đã kiểm tra tương tác desktop và mobile 375×812. Chưa thử trên điện thoại thật/Safari.
  - ĐẠT: onboarding 3 bước (chặn ô bắt buộc, nhận "75,5"), kết quả khớp Mifflin (ví dụ giả: 2641 duy trì → 2391 kcal, macro cộng ≈ 2390), lưu và reload vẫn còn; Dashboard tổng khớp item; tìm "pho bo" không dấu ra Phở bò; "Thêm vào bữa" điền sẵn editor; sửa kcal + đổi ngày 20/11 + bữa tối → chuyển history?date=2026-11-20 đúng 500 kcal; xóa món → trạng thái trống; editor chặn kcal âm/thiếu trường, nhận "1,5"; cân nặng trùng ngày báo và cập nhật không tạo dòng mới, chặn -5/abc/0; bốn tab AI/ảnh/nhãn/voice hiện "chưa kết nối" + nút nhập thủ công, không xin quyền; 404 tiếng Việt; banner Dữ liệu minh họa trên các trang tracker; không console error từ app.
  - Mobile: cả sáu route không tràn ngang (scrollWidth = 375), không chữ < 12px trong main.
  - ĐÃ SỬA (Claude, cùng ngày) 3 lỗi dưới đây, xem mục "Sửa sau kiểm tra UI". Ghi nhận gốc: (1) Thanh điều hướng mobile không có Cài đặt (`app-shell.tsx` chỉ lấy links 0–3), không có đường vào /settings trên điện thoại ngoài link ẩn trong nhật ký minh họa. (2) Khi đã lưu hồ sơ, "Áp dụng mục tiêu mẫu" ở Cài đặt báo thành công nhưng Dashboard bỏ qua vì `Dashboard` ưu tiên prop `targets` từ hồ sơ; Cài đặt cũng hiện 2000 kcal mẫu thay vì mục tiêu đã lưu. (3) Trang Tổng quan sau thiết lập chỉ hiện mục tiêu, Dashboard ngày (đã nạp/còn lại/bữa) phải bấm "Xem nhật ký minh họa" mới thấy, lệch PRD mục 4.
  - Nhỏ: nhãn "Kho món ăn" xuống 2 dòng ở mobile nav; xóa món không hỏi xác nhận; thông báo required/định dạng ngày theo ngôn ngữ trình duyệt (tiếng Anh trong môi trường test); dropdown "Chọn món mẫu" trống dù editor đã điền từ ?food=.
- Sửa sau kiểm tra UI (Claude, 22/11/2026):
  - Mobile: thêm nút Cài đặt (icon, aria-label "Cài đặt") ở topbar khi ≤700px; nhãn mobile nav "Kho món" để không xuống dòng (`app-shell.tsx`, cuối `globals.css`).
  - Mục tiêu một nguồn: tách `src/features/goals/profile-store.ts` (đọc/lưu/xóa hồ sơ localStorage). Bỏ mục tiêu mẫu 2000 kcal khỏi DemoProvider/data; Dashboard bắt buộc nhận `targets`. Cài đặt hiện mục tiêu từ hồ sơ (chỉ đọc) + link `/#muc-tieu` để chỉnh; chưa có hồ sơ thì báo chưa thiết lập, không tạo mục tiêu giả.
  - Tổng quan: khi đã lưu hồ sơ hiện Dashboard ngày ở đầu trang (h1 "Một ngày của bạn"), thẻ mục tiêu `#muc-tieu` bên dưới; bỏ nút "Xem nhật ký minh họa". Chưa có hồ sơ hoặc đang chỉnh vẫn là form thiết lập.
  - Test: sửa selector `getByRole("alert")` bị trùng route announcer của Next (lỗi test có sẵn), thêm E2E cho 3 lỗi trên.
  - Đã chạy: `npm run lint` PASS, `npm run typecheck` PASS, `npm run build` PASS (6 route + not-found), `npx playwright test` 6/6 PASS (desktop Edge + Pixel 7). Kiểm tra lại trên trình duyệt desktop và mobile 375px: Dashboard/Cài đặt cùng 2391 → đổi sang Duy trì cùng 2641; nút Cài đặt mobile vào /settings; không tràn ngang.
  - `.claude/launch.json` là cấu hình preview cục bộ của Claude, chưa quyết định có commit hay không.
- Review độc lập nhánh `feature/app-shell` (agent riêng do Claude giao, 22/11/2026, chỉ đọc): lint/typecheck/build PASS, Playwright 6/6 PASS. Công thức Mifflin, hệ số vận động, ÷7 và chia macro tính tay đúng. Không có blocker, không lộ secret.
  - Cần sửa (Claude đã xác minh 1–2 bằng đọc code): (1) `targets.ts:82` ngưỡng 1200 kcal áp cả khi Duy trì/Tăng → người hợp lệ (ví dụ giả: nữ 45 kg, 150 cm, 70 tuổi, ít vận động) không có mục tiêu và nhận lời khuyên "chọn duy trì" sai. (2) `meal-editor.tsx:23`, `weight-tracker.tsx:12` parse bằng `Number(replace(",", "."))`: "1.200" kcal thành 1,2; chấp nhận "1e3"; cân nặng không có giới hạn trên. Nên dùng chung parser chặt của `targets.ts` + giới hạn. (3) E2E dùng "80,0" không chứng minh parse dấu phẩy; thiếu test Duy trì, BMI < 18,5, ngưỡng thấp; chưa có unit test `targets.ts`.
  - ĐÃ SỬA (Claude, 22/11/2026, đã commit `fix(app-shell): address review findings` với sự cho phép của người dùng, chưa push): (1) ngưỡng 1200 kcal chỉ chặn khi có thâm hụt; Duy trì/Tăng dưới 1200 hiện mục tiêu kèm lưu ý hỏi chuyên gia (`plan.lowIntake`). (2) `parseDecimal`/`looksLikeThousands` export từ `targets.ts`, dùng ở editor và cân nặng: từ chối "1.200", "1e3", âm; editor giới hạn 10000 kcal/2000 g, cân nặng 20–350 kg. (3) Thêm Vitest 5.1.1 (devDependency, `npm audit` 0 lỗ hổng; bản 3.x bị lỗ hổng tinypool nên không dùng), `vitest.config.mts`, `tests/unit/targets.test.ts` 28 case; scripts `test`, `test:e2e`; E2E mới cho editor hàng nghìn/dấu phẩy, bỏ assertion "2000" yếu. Nhỏ: banner ẩn ở /settings; server snapshot `undefined` → hiện trạng thái đang tải thay vì chớp form; Playwright channel theo `PLAYWRIGHT_CHANNEL`, CI dùng Chromium, local Edge; `.gitignore` thêm `.claude/`. `next-env.d.ts` bị Next đổi qua lại giữa dev/build nên đã thêm vào `.gitignore` và `git rm --cached` (file local vẫn còn); đã thử `tsc --noEmit` không có file này vẫn đạt.
  - Kiểm tra sau sửa: lint PASS, typecheck PASS, `npm test` 28/28 PASS, build PASS, Playwright 8/8 PASS (chạy bằng config tạm trỏ tới `next dev` đang chạy sẵn ở cổng 3000 PID 30348 không do Claude mở, vì webServer cổng 3100 không khởi động được khi có dev server khác; config tạm đã xóa). Ảnh Playwright: Duy trì nữ 45 kg/150 cm/70 tuổi → 1.052 kcal kèm lưu ý.
  - Ghi nhận gốc nhỏ: Playwright cố định `channel: "msedge"`; banner "Dữ liệu minh họa" sai ngữ cảnh ở /settings (hồ sơ là localStorage bền); người đã lưu thấy form thiết lập chớp trước Dashboard (server snapshot null); `.gitignore` chưa có `.claude/` và `next-env.d.ts` đang được commit.
- Chưa test AI thật, Supabase/RLS, persistence: chưa triển khai, không được coi đạt A01–A15 đầy đủ.

## Vấn đề môi trường và giới hạn

- Turbopack lỗi tạo process xử lý CSS ngay cả ngoài sandbox. Scripts dev/build dùng --webpack, build thành công.
- TypeScript latest 7 chưa được typescript-eslint hỗ trợ; đã chọn 5.9. ESLint 9 tương thích nhưng npm báo hết hỗ trợ; cần đánh giá nâng cùng plugin sau, không mặc định lỗi đã hết.
- Đã khởi động lại server bằng `npm run dev` và xác minh trang chủ trả HTTP 200, có nội dung Dashboard. Server chạy tại http://127.0.0.1:3000 trong phiên terminal. Cấu hình `agentRules: false` để Next.js giữ nguyên AGENTS của dự án khi chạy dev.
- Không có DB/Auth/migration/AI thật hoặc deployment. Chưa xác minh credentials. G1 editor nhập tổng, chưa quy đổi khẩu phần nghiệp vụ.

## Việc tiếp theo

1. Đã kiểm tra UI và sửa 3 lỗi (xem mục Kiểm tra). Còn lỗi nhỏ tùy chọn: xóa món không hỏi xác nhận, dropdown "Chọn món mẫu" trống khi mở từ ?food=. Chưa thử điện thoại thật/Safari.
2. Đã commit G1, review độc lập và commit sửa review trên `feature/app-shell` (xem `git log`). CHƯA push. Tiếp theo: xin phép push `feature/app-shell` lên origin, rồi xin phép merge vào main.
3. Chỉ merge main sau khi giai đoạn đạt kiểm tra cần thiết và có quyền tạo commit/push tương ứng. Chưa merge vì thiếu visual verification.
4. Tiếp tục G2 trên feature/auth-database sau nền được chốt: Supabase, auth, migrations/RLS và tests owner. Kế hoạch đã duyệt; không hỏi lại phạm vi MVP.

## Ghi nhận từ chat phụ

### Bổ sung từ chat phụ — quy ước đóng góp, 22/11/2026

- Người dùng duyệt tạo quy ước code/Git trong chat phụ. Đã thêm `CONTRIBUTING.md` và liên kết từ `AGENTS.md`; Claude đọc AGENTS sẽ nhận hướng dẫn này.
- Phạm vi chat phụ chỉ là tài liệu; không code app, đổi branch, stage, commit, push hay merge. Không thay tiến độ triển khai của chat chính.
- Khi đọc workspace cho thay đổi này: branch là `feature/app-shell`; AGENTS/PLAN đã có thay đổi chưa commit, package.json là file mới của chat chính. Giữ nguyên các thay đổi đó.
- PLAN và AGENTS hiện ghi kế hoạch đã được duyệt; các mục trạng thái cũ bên trên chưa phản ánh đầy đủ tiến độ chat chính. Phiên triển khai chính cần cập nhật chúng khi ghi checkpoint.
- Kiểm tra cho phần tài liệu: rà quy ước với PLAN/AGENTS, kiểm tra liên kết local và whitespace diff; không chạy build/test app vì không thay code/cấu hình.
- Việc tiếp theo: áp dụng CONTRIBUTING khi triển khai và bàn giao; commit/push tài liệu mới vẫn cần người dùng cho phép. Chưa cài hooks/commitlint/CI.

> Tiếp tục dự án Calories Tracker trong thư mục này. Đọc AGENTS.md, docs/HANDOFF.md, PRD.md, CONTEXT.md và docs/PLAN.md nếu có. Đối chiếu trạng thái thực tế, tiếp tục mục “Việc tiếp theo” trong phạm vi đã được duyệt; không làm lại phần đã xong. Nếu kế hoạch chưa chốt thì chỉ lập kế hoạch, chưa code. Cập nhật HANDOFF sau từng phần việc để Codex hoặc Claude tiếp quản được.
