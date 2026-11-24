import type { NextConfig } from "next";

// Thử trên điện thoại cùng mạng: `npm run dev:lan` và đặt DEV_ORIGINS=<IP máy tính> trong .env.local
// (danh sách hostname cách nhau bằng dấu phẩy, không có http:// hay cổng). Chỉ có tác dụng ở chế độ dev.
const devOrigins = (process.env.DEV_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean);

const nextConfig: NextConfig = { reactStrictMode: true, agentRules: false, allowedDevOrigins: devOrigins };
export default nextConfig;
