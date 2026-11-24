// HTTPS cho thử nghiệm trên điện thoại trong mạng LAN (nút Nói cần HTTPS).
// - Tạo chứng chỉ tự ký certs/dev-cert.pem cho localhost + IP LAN (một lần, bằng OpenSSL có sẵn trong Git for Windows).
// - Chạy `next dev` ở 127.0.0.1:<NEXT_PORT> và một cổng HTTPS ở 0.0.0.0:<HTTPS_PORT> chuyển tiếp vào đó (kể cả WebSocket HMR).
// Không cài chứng chỉ gốc vào hệ thống; điện thoại sẽ cảnh báo chứng chỉ tự ký, bấm "Nâng cao → Tiếp tục" một lần.
//
// Dùng: npm run dev:https            (chạy cả next dev và cổng HTTPS)
//       node scripts/dev-https.mjs --proxy-only --target 3100 --port 3443   (chỉ cổng HTTPS, dùng trong test)
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const proxyOnly = args.includes("--proxy-only");
const httpsPort = Number(option("port", process.env.HTTPS_PORT ?? "3443"));
const targetPort = Number(option("target", process.env.NEXT_PORT ?? "3000"));
const certDir = path.resolve("certs");
const keyFile = path.join(certDir, "dev-key.pem");
const certFile = path.join(certDir, "dev-cert.pem");

// Phân loại IP: mạng LAN thật (điện thoại cùng Wi-Fi vào được), Tailscale (cần Tailscale trên điện thoại),
// bỏ card ảo (WSL/Hyper-V/Docker/VM) vì điện thoại không tới được.
const VIRTUAL = /vEthernet|WSL|Hyper-V|Docker|VirtualBox|VMware|Loopback|vboxnet|br-|veth/i;
function addresses() {
  const lan = [];
  const tailscale = [];
  for (const [name, items] of Object.entries(os.networkInterfaces())) {
    for (const item of items ?? []) {
      if (item.family !== "IPv4" || item.internal || item.address.startsWith("169.254.")) continue;
      if (/tailscale/i.test(name) || item.address.startsWith("100.")) tailscale.push(item.address);
      else if (!VIRTUAL.test(name)) lan.push(item.address);
    }
  }
  return { lan, tailscale };
}

function findOpenssl() {
  const candidates = ["openssl", "C:\\Program Files\\Git\\usr\\bin\\openssl.exe", "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe"];
  for (const candidate of candidates) {
    try { execFileSync(candidate, ["version"], { stdio: "ignore" }); return candidate; } catch { /* thử tiếp */ }
  }
  throw new Error("Không tìm thấy OpenSSL. Cài Git for Windows hoặc OpenSSL rồi chạy lại.");
}

/** Tạo lại chứng chỉ khi chưa có hoặc khi IP LAN hiện tại chưa nằm trong chứng chỉ. */
function ensureCertificate(ips) {
  const marker = path.join(certDir, "hosts.txt");
  const wanted = ["localhost", "tcgm.test", "127.0.0.1", ...ips].join(",");
  if (existsSync(keyFile) && existsSync(certFile) && existsSync(marker) && readFileSync(marker, "utf8") === wanted) return;
  mkdirSync(certDir, { recursive: true });
  const san = ["DNS:localhost", "DNS:tcgm.test", "IP:127.0.0.1", ...ips.map(ip => `IP:${ip}`)].join(",");
  execFileSync(findOpenssl(), [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "365",
    "-keyout", keyFile, "-out", certFile, "-subj", "/CN=tcgm-dev",
    "-addext", `subjectAltName=${san}`, "-addext", "keyUsage=digitalSignature,keyEncipherment", "-addext", "extendedKeyUsage=serverAuth",
  ], { stdio: "ignore" });
  writeFileSync(marker, wanted);
  console.log(`Đã tạo chứng chỉ tự ký cho: ${wanted}`);
}

const { lan, tailscale } = addresses();
const ips = [...lan, ...tailscale];
ensureCertificate(ips);

let child;
if (!proxyOnly) {
  // Chạy Next.js bằng chính Node hiện tại, không qua shell (tránh cảnh báo DEP0190 và lỗi trích dẫn tham số).
  const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
  child = spawn(process.execPath, [nextBin, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(targetPort)], {
    stdio: "inherit", env: { ...process.env, DEV_ORIGINS: [process.env.DEV_ORIGINS, ...ips].filter(Boolean).join(",") },
  });
  child.on("exit", code => process.exit(code ?? 0));
}

const server = https.createServer({ key: readFileSync(keyFile), cert: readFileSync(certFile) }, (req, res) => {
  const upstream = http.request({
    host: "127.0.0.1", port: targetPort, method: req.method, path: req.url,
    // Giữ Host gốc để Next.js so khớp Origin của server action; báo cho Next biết kết nối gốc là HTTPS.
    headers: { ...req.headers, "x-forwarded-proto": "https", "x-forwarded-host": req.headers.host ?? "" },
  }, upstreamRes => {
    res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end("Next.js chưa sẵn sàng, thử tải lại sau vài giây.");
  });
  req.pipe(upstream);
});

// WebSocket (HMR khi chạy dev): chuyển tiếp nguyên kết nối.
server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(targetPort, "127.0.0.1", () => {
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let index = 0; index < req.rawHeaders.length; index += 2) lines.push(`${req.rawHeaders[index]}: ${req.rawHeaders[index + 1]}`);
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(httpsPort, "0.0.0.0", () => {
  console.log(`\nHTTPS sẵn sàng (chuyển tiếp tới 127.0.0.1:${targetPort}):`);
  console.log(`  https://localhost:${httpsPort}`);
  for (const ip of lan) console.log(`  https://${ip}:${httpsPort}   ← mở trên điện thoại cùng Wi-Fi`);
  for (const ip of tailscale) console.log(`  https://${ip}:${httpsPort}   (chỉ khi điện thoại cũng bật Tailscale)`);
  if (!lan.length) console.log("  (Không thấy mạng LAN/Wi-Fi nào; kiểm tra máy tính đã kết nối mạng.)");
  console.log("Điện thoại sẽ cảnh báo chứng chỉ tự ký: bấm Nâng cao → Tiếp tục.");
  console.log("Lần đầu mở mỗi trang có thể mất 10–30 giây để Next.js biên dịch.\n");
});

const shutdown = () => { server.close(); child?.kill(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
