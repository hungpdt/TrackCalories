"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Camera, ImagePlus, Mic, MicOff, Pencil, ScanLine, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { PageHeading } from "@/components/ui/shared";
import { uuid } from "@/lib/uuid";
import type { AiDraft, SaveMealInput } from "@/lib/ai/draft";
import { DraftEditor, emptyItem, itemFromAi, type EditorItem } from "./draft-editor";
import { compressImage } from "./image";
import { takePendingPhotos } from "./pending-photos";
import { useSpeech } from "./use-speech";

const MAX_IMAGES = 4;
const MAX_NOTE = 1000;
// Server chờ OpenAI tối đa ~50 s; client đợi thêm biên mạng rồi tự hủy.
const CLIENT_TIMEOUT_MS = 75_000;
type Photo = { id: string; blob: Blob; url: string };
type Stage = { kind: "capture" } | { kind: "editor"; items: EditorItem[]; warnings: string[]; fromAi: boolean };

export function QuickLog({ today, defaultMealType, start }: { today: string; defaultMealType: SaveMealInput["mealType"]; start?: "manual" | "note" }) {
  const [stage, setStage] = useState<Stage>(start === "manual" ? { kind: "editor", items: [emptyItem()], warnings: [], fromAi: false } : { kind: "capture" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const photosRef = useRef(photos);

  // Giải phóng blob URL của ảnh xem trước khi rời màn.
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { for (const photo of photosRef.current) URL.revokeObjectURL(photo.url); }, []);

  const appendTranscript = useCallback((text: string) => {
    if (!text) return;
    setNote(current => Array.from(current ? `${current.trimEnd()} ${text}` : text).slice(0, MAX_NOTE).join(""));
  }, []);
  const speech = useSpeech(appendTranscript);

  // Từ bảng "+": nhận ảnh đã chọn ở trang trước, hoặc đặt con trỏ vào ô ghi chú.
  useEffect(() => {
    const files = takePendingPhotos();
    if (files.length) void addFiles(files);
    // Đợi bảng "+" đóng xong: <dialog> trả focus về nút + khi đóng, đè lên focus đặt quá sớm.
    const focusTimer = start === "note" ? window.setTimeout(() => noteInput.current?.focus(), 150) : undefined;
    return () => window.clearTimeout(focusTimer);
    // Chỉ chạy một lần khi mở màn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFiles(files: FileList | File[] | null) {
    if (!files?.length) return;
    setError("");
    const room = MAX_IMAGES - photos.length;
    if (room <= 0) { setError(`Tối đa ${MAX_IMAGES} ảnh mỗi lần.`); return; }
    const picked = Array.from(files).slice(0, room);
    const added: Photo[] = [];
    for (const file of picked) {
      try {
        const blob = await compressImage(file);
        added.push({ id: uuid(), blob, url: URL.createObjectURL(blob) });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Không đọc được ảnh.");
      }
    }
    if (files.length > room) setError(`Chỉ thêm ${room} ảnh; tối đa ${MAX_IMAGES} ảnh mỗi lần.`);
    setPhotos(current => [...current, ...added]);
  }

  function removePhoto(id: string) {
    setPhotos(current => {
      const photo = current.find(item => item.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return current.filter(item => item.id !== id);
    });
  }

  async function analyze() {
    if (busy) return;
    if (!photos.length && !note.trim()) { setError("Thêm ít nhất một ảnh hoặc ghi chú."); return; }
    speech.stop();
    setBusy(true);
    setError("");
    setInfo("");
    const form = new FormData();
    form.append("note", note.trim());
    photos.forEach((photo, index) => form.append("images", photo.blob, `anh-${index + 1}.jpg`));
    // Đếm giây để người dùng biết vẫn đang chạy; tự hủy sau CLIENT_TIMEOUT để không quay mãi.
    const startedAt = Date.now();
    setElapsed(0);
    const ticker = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const response = await fetch("/api/ai/quick-log", { method: "POST", body: form, signal: controller.signal });
      const fallback = response.status === 401 ? "Phiên đăng nhập đã hết. Tải lại trang để đăng nhập."
        : response.status >= 500 ? "AI phản hồi quá lâu hoặc máy chủ đang lỗi. Thử lại hoặc nhập thủ công; ảnh và ghi chú vẫn được giữ."
        : "Chưa phân tích được. Thử lại hoặc nhập thủ công.";
      const body: { draft?: AiDraft; remaining?: number; error?: string } = await response.json().catch(() => ({ error: fallback }));
      if (!response.ok || !body.draft) { setError(body.error ?? "Chưa phân tích được. Thử lại hoặc nhập thủ công."); return; }
      if (!body.draft.items.length) {
        setError(body.draft.warnings[0] ?? "AI chưa nhận ra món nào. Thêm ghi chú rõ hơn hoặc nhập thủ công.");
        return;
      }
      if (typeof body.remaining === "number") setInfo(`Còn ${body.remaining} lượt AI hôm nay.`);
      speech.stop();
      setStage({ kind: "editor", items: body.draft.items.map(itemFromAi), warnings: body.draft.warnings, fromAi: true });
    } catch {
      setError(controller.signal.aborted
        ? `AI chưa trả lời sau ${CLIENT_TIMEOUT_MS / 1000} giây. Ảnh và ghi chú vẫn được giữ; thử lại hoặc nhập thủ công.`
        : "Mất kết nối. Ảnh và ghi chú vẫn được giữ; thử lại hoặc nhập thủ công.");
    } finally {
      window.clearInterval(ticker);
      window.clearTimeout(abortTimer);
      setBusy(false);
    }
  }

  const heading = <PageHeading eyebrow="GHI NHANH" title="Ghi một bữa ăn" description="Chụp ảnh, nói hoặc gõ thêm vài chữ. AI tạo bản nháp, bạn kiểm tra rồi lưu." />;

  if (stage.kind === "editor") return <>
    {heading}
    {info && <p className="feedback" role="status">{info}</p>}
    <DraftEditor initialItems={stage.items} warnings={stage.warnings} today={today} defaultMealType={defaultMealType} onCancel={() => setStage({ kind: "capture" })} />
  </>;

  return <>
    {heading}
    <section className="card quick-capture" aria-labelledby="capture-title">
      <h2 id="capture-title" className="sr-only">Ảnh và ghi chú</h2>
      <div className="photo-grid">
        {photos.map((photo, index) => <figure key={photo.id} className="photo-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước cục bộ (blob URL) */}
          <img src={photo.url} alt={`Ảnh bữa ăn ${index + 1}`} />
          <button type="button" className="photo-remove" aria-label={`Bỏ ảnh ${index + 1}`} onClick={() => removePhoto(photo.id)}><X size={16} /></button>
        </figure>)}
        {photos.length < MAX_IMAGES && <>
          <button type="button" className="photo-add" onClick={() => cameraInput.current?.click()}><Camera size={26} /><span>Chụp ảnh</span></button>
          <button type="button" className="photo-add" onClick={() => fileInput.current?.click()}><ImagePlus size={26} /><span>Chọn ảnh</span></button>
        </>}
      </div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={event => { void addFiles(event.target.files); event.target.value = ""; }} />
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden onChange={event => { void addFiles(event.target.files); event.target.value = ""; }} />
      <p className="small muted">Tối đa {MAX_IMAGES} ảnh. Ảnh được thu nhỏ trên máy trước khi gửi và không được lưu lại.</p>

      <label className="field note-field">Ghi chú thêm
        <span className="field-hint">Gram, thành phần, cách nấu… Ví dụ: “200g cơm, 150g ức gà áp chảo ít dầu, rau luộc”. Số gram bạn ghi được ưu tiên hơn ước lượng từ ảnh.</span>
        <textarea ref={noteInput} rows={4} maxLength={MAX_NOTE} value={note} onChange={event => setNote(event.target.value)} placeholder="Gõ hoặc bấm micro để nói" />
      </label>
      <div className="capture-actions">
        <button type="button" className={`button secondary ${speech.listening ? "listening" : ""}`} disabled={speech.status === "unknown"}
          aria-pressed={speech.listening} onClick={() => speech.listening ? speech.stop() : speech.start()}>
          {speech.listening ? <><MicOff size={18} /> Dừng nói</> : <><Mic size={18} /> Nói</>}
        </button>
        <button type="button" className="button" onClick={analyze} disabled={busy}><Sparkles size={18} /> {busy ? `AI đang phân tích… ${elapsed}s` : "Tạo bản nháp"}</button>
      </div>
      {busy && <p className="small muted" role="status">Thường mất 10–30 giây. Có thể để màn hình sáng và chờ; ảnh và ghi chú vẫn được giữ nếu có lỗi.</p>}
      {/* Ngay dưới nút để người dùng điện thoại thấy phản hồi khi bấm Nói. */}
      {speech.listening && <p className="small muted" role="status">Đang nghe… {speech.interim}</p>}
      {speech.error && <p className="error-message" role="alert">{speech.error}</p>}
      {!speech.error && speech.status === "insecure" && <p className="small muted speech-hint">Mở qua http nên nút Nói không dùng được; hãy dùng micro trên bàn phím điện thoại.</p>}
      {!speech.error && speech.status === "unsupported" && <p className="small muted speech-hint">Trình duyệt này chưa hỗ trợ nói thành chữ; hãy gõ hoặc dùng micro trên bàn phím.</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <p className="small muted ai-privacy">Khi bấm “Tạo bản nháp”, ảnh và ghi chú được gửi tới OpenAI để ước tính. Kết quả chỉ là bản nháp, chỉ lưu khi bạn xác nhận.</p>
    </section>

    <section className="other-methods" aria-label="Cách nhập khác">
      <button type="button" className="method-chip" onClick={() => { speech.stop(); setStage({ kind: "editor", items: [emptyItem()], warnings: [], fromAi: false }); }}><Pencil size={18} /> Nhập thủ công</button>
      <Link className="method-chip" href={`/foods?date=${today}`}><BookOpen size={18} /> Chọn từ kho món</Link>
      <span className="method-chip disabled" aria-disabled="true"><ScanLine size={18} /> Quét nhãn <small>(sắp có)</small></span>
    </section>
  </>;
}
