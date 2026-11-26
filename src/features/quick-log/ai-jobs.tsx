"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import type { AiDraft, SaveMealInput } from "@/lib/ai/draft";
import { uuid } from "@/lib/uuid";
import { compressImage } from "./image";

/**
 * Ghi nhanh bằng AI chạy nền: bấm "Tạo bản nháp" xong người dùng quay về trang chủ (hoặc đi trang khác),
 * thẻ "Đang phân tích" hiện vòng tiến độ; xong thì bấm vào để kiểm tra bản nháp.
 * Provider nằm trong AppShell (layout không bị unmount khi chuyển trang), nên request vẫn chạy khi đổi trang.
 * Bản nháp đã xong được lưu tạm trong sessionStorage để tải lại trang vẫn mở được; request đang chạy thì mất khi tải lại.
 */
export type AiJob = {
  id: string;
  date: string;
  mealType: SaveMealInput["mealType"];
  startedAt: number;
  status: "running" | "done" | "error";
  /** Ảnh đầu tiên đã thu nhỏ (data URL), dùng làm ảnh xem trước và ảnh món khi lưu. */
  photo: string | null;
  draft?: AiDraft;
  remaining?: number;
  error?: string;
};

type StartInput = { photos: Blob[]; note: string; date: string; mealType: SaveMealInput["mealType"] };
type Jobs = {
  jobs: AiJob[];
  /** Đã đọc xong bản nháp lưu tạm (tránh báo "không tìm thấy" trước khi đọc). */
  loaded: boolean;
  start: (input: StartInput) => Promise<string>;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  canRetry: (id: string) => boolean;
};

const STORAGE_KEY = "tcgm-ai-jobs";
// Server chờ OpenAI tối đa ~50 s; client đợi thêm biên mạng rồi tự hủy.
const CLIENT_TIMEOUT_MS = 75_000;
const AiJobsContext = createContext<Jobs | null>(null);

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(url: string) {
  return (await fetch(url)).blob();
}

function load(): AiJob[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as AiJob[];
    // Request đang chạy không sống qua lần tải lại trang.
    return saved.map(job => job.status === "running" ? { ...job, status: "error", error: "Bị gián đoạn khi tải lại trang. Hãy ghi lại bữa này." } : job);
  } catch { return []; }
}

function persist(jobs: AiJob[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.filter(job => job.status !== "running"))); }
  catch { /* hết chỗ hoặc trình duyệt chặn storage: chỉ mất khả năng khôi phục sau khi tải lại */ }
}

async function requestDraft(form: FormData): Promise<Pick<AiJob, "draft" | "remaining" | "error">> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const response = await fetch("/api/ai/quick-log", { method: "POST", body: form, signal: controller.signal });
    const fallback = response.status === 401 ? "Phiên đăng nhập đã hết. Tải lại trang để đăng nhập."
      : response.status >= 500 ? "AI phản hồi quá lâu hoặc máy chủ đang lỗi. Thử lại hoặc nhập thủ công."
      : "Chưa phân tích được. Thử lại hoặc nhập thủ công.";
    const body: { draft?: AiDraft; remaining?: number; error?: string } = await response.json().catch(() => ({ error: fallback }));
    if (!response.ok || !body.draft) return { error: body.error ?? fallback };
    if (!body.draft.items.length) return { error: body.draft.warnings[0] ?? "AI chưa nhận ra món nào. Thêm ghi chú rõ hơn hoặc nhập thủ công." };
    return { draft: body.draft, remaining: body.remaining };
  } catch {
    return { error: controller.signal.aborted ? `AI chưa trả lời sau ${CLIENT_TIMEOUT_MS / 1000} giây. Thử lại hoặc nhập thủ công.` : "Mất kết nối khi gửi cho AI. Thử lại hoặc nhập thủ công." };
  } finally {
    window.clearTimeout(timer);
  }
}

export function AiJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  // Ảnh gốc + ghi chú của request, giữ trong bộ nhớ để "Thử lại" không phải chọn lại ảnh.
  const inputs = useRef(new Map<string, FormData>());
  const [loaded, setLoaded] = useState(false);

  // Đọc sessionStorage sau khi mount (server không có storage; đọc lúc render sẽ lệch HTML khi hydrate).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setJobs(current => [...current, ...load()]); setLoaded(true); }, []);
  useEffect(() => { if (loaded) persist(jobs); }, [jobs, loaded]);

  const update = useCallback((id: string, patch: Partial<AiJob>) => setJobs(current => current.map(job => job.id === id ? { ...job, ...patch } : job)), []);

  const run = useCallback(async (id: string) => {
    const form = inputs.current.get(id);
    if (!form) return;
    update(id, { status: "running", startedAt: Date.now(), error: undefined });
    const result = await requestDraft(form);
    update(id, result.draft ? { status: "done", ...result } : { status: "error", error: result.error });
  }, [update]);

  const start = useCallback(async ({ photos, note, date, mealType }: StartInput) => {
    const id = uuid();
    const form = new FormData();
    form.append("note", note);
    photos.forEach((photo, index) => form.append("images", photo, `anh-${index + 1}.jpg`));
    inputs.current.set(id, form);
    let photo: string | null = null;
    try { if (photos[0]) photo = await blobToDataUrl(await compressImage(new File([photos[0]], "anh.jpg", { type: "image/jpeg" }), 900, 0.78)); }
    catch { photo = null; }
    setJobs(current => [{ id, date, mealType, startedAt: Date.now(), status: "running", photo }, ...current]);
    void run(id);
    return id;
  }, [run]);

  const dismiss = useCallback((id: string) => { inputs.current.delete(id); setJobs(current => current.filter(job => job.id !== id)); }, []);
  const canRetry = useCallback((id: string) => inputs.current.has(id), []);
  const retry = useCallback((id: string) => { void run(id); }, [run]);

  const value = useMemo(() => ({ jobs, loaded, start, retry, dismiss, canRetry }), [jobs, loaded, start, retry, dismiss, canRetry]);
  return <AiJobsContext.Provider value={value}>{children}<AiReadyToast /></AiJobsContext.Provider>;
}

export function useAiJobs() {
  const value = useContext(AiJobsContext);
  if (!value) throw new Error("useAiJobs cần AiJobsProvider");
  return value;
}

/** Tiến độ ước lượng (AI không báo tiến độ thật): tăng nhanh lúc đầu, chậm dần, dừng ở 95% tới khi xong. */
export function estimatedPercent(startedAt: number, now: number) {
  return Math.min(95, Math.round(100 * (1 - Math.exp(-(now - startedAt) / 12_000))));
}

export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/** Báo nhỏ khi bản nháp xong lúc người dùng đang ở trang khác (trang chủ đã có thẻ riêng). */
function AiReadyToast() {
  const context = useContext(AiJobsContext);
  const pathname = usePathname();
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const ready = context?.jobs.find(job => job.status === "done" && !seen.has(job.id));
  if (!ready || pathname === "/" || pathname === "/add-meal") return null;
  const close = () => setSeen(current => new Set(current).add(ready.id));
  return <div className="ai-toast" role="status">
    <Sparkles size={18} aria-hidden="true" />
    <span>Bản nháp AI đã sẵn sàng</span>
    <Link href={`/add-meal?job=${ready.id}`} onClick={close}>Kiểm tra</Link>
    <button type="button" className="icon-button" aria-label="Đóng thông báo" onClick={close}><X size={16} /></button>
  </div>;
}
