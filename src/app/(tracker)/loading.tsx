// Hiện ngay khi chuyển tab (Trang chủ/Tiến độ/Hồ sơ…) trong lúc server tải dữ liệu trang mới.
// loading.tsx ở src/app chỉ bọc layout gốc, không bọc trang con trong layout (tracker) nên trước đây
// bấm tab không có phản hồi gì cho tới khi trang mới tải xong.
export { default } from "../loading";
