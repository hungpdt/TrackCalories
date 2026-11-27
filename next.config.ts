import type { NextConfig } from "next";

// Thử trên điện thoại cùng mạng: `npm run dev:lan` và đặt DEV_ORIGINS=<IP máy tính> trong .env.local
// (danh sách hostname cách nhau bằng dấu phẩy, không có http:// hay cổng). Chỉ có tác dụng ở chế độ dev.
const devOrigins = (process.env.DEV_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean);

// devIndicators: false ẩn nút "N"/"Rendering…" của Next ở chế độ dev (lỗi biên dịch/runtime vẫn hiện).
// staleTimes.dynamic: router phía trình duyệt giữ trang động vừa xem 30 giây, quay lại tab hiện ngay không chờ server.
// Mọi server action ghi dữ liệu đều gọi revalidatePath (hoặc đổi cookie/redirect), việc này xóa toàn bộ cache router
// phía trình duyệt nên số liệu sau khi ghi vẫn mới ngay.
const nextConfig: NextConfig = {
  reactStrictMode: true, agentRules: false, allowedDevOrigins: devOrigins, devIndicators: false,
  // static: thời hạn của bản tải sẵn đầy đủ (Link prefetch ở thanh tab), hạ từ 300 s mặc định xuống 60 s
  // để dữ liệu sửa từ thiết bị khác không cũ quá lâu.
  experimental: { staleTimes: { dynamic: 30, static: 60 } },
};
export default nextConfig;
