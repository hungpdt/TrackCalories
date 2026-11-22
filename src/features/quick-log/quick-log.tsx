"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Camera, ImagePlus, Mic, MicOff, Pencil, ScanLine, Sparkles, X } from "lucide-react";
import { PageHeading } from "@/components/ui/shared";
import type { AiDraft } from "@/lib/ai/draft";
import { DraftEditor, emptyItem, itemFromAi, type EditorItem } from "./draft-editor";
import { compressImage } from "./image";
import { useSpeech } from "./use-speech";

const MAX_IMAGES = 4;
const MAX_NOTE = 1000;
type Photo = { id: string; blob: Blob; url: string };
type Stage = { kind: "capture" } | { kind: "editor"; items: EditorItem[]; warnings: string[]; fromAi: boolean };

export function QuickLog({ today, prefill }: { today: string; prefill?: EditorItem }) {
  const [stage, setStage] = useState<Stage>(prefill ? { kind: "editor", items: [prefill], warnings: [], fromAi: false } : { kind: "capture" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);

  // Giải phóng blob URL của ảnh xem trước khi rời màn.
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { for (const photo of photosRef.current) URL.revokeObjectURL(photo.url); }, []);

  const appendTranscript = useCallback((text: string) => {
    if (!text) return;
    setNote(current => Array.from(current ? `${current.trimEnd()} ${text}` : text).slice(0, MAX_NOTE).join(""));
  }, []);
  const speech = useSpeech(appendTranscript);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = MAX_IMAGES - photos.length;
    if (room <= 0) { setError(`Tối đa ${MAX_IMAGES} ảnh mỗi lần.`); return; }
    const picked = Array.from(files).slice(0, room);
    const added: Photo[] = [];
    for (const file of picked) {
      try {
        const blob = await compressImage(file);
        added.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
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
    try {
      const response = await fetch("/api/ai/quick-log", { method: "POST", body: form });
      const body: { draft?: AiDraft; remaining?: number; error?: string } = await response.json().catch(() => ({ error: "Phiên đăng nhập có thể đã hết. Tải lại trang." }));
      if (!response.ok || !body.draft) { setError(body.error ?? "Chưa phân tích được. Thử lại hoặc nhập thủ công."); return; }
      if (!body.draft.items.length) {
        setError(body.draft.warnings[0] ?? "AI chưa nhận ra món nào. Thêm ghi chú rõ hơn hoặc nhập thủ công.");
        return;
      }
      if (typeof body.remaining === "number") setInfo(`Còn ${body.remaining} lượt AI hôm nay.`);
      setStage({ kind: "editor", items: body.draft.items.map(itemFromAi), warnings: body.draft.warnings, fromAi: true });
    } catch {
      setError("Mất kết nối. Ảnh và ghi chú vẫn được giữ; thử lại hoặc nhập thủ công.");
    } finally {
      setBusy(false);
    }
  }

  const heading = <PageHeading eyebrow="GHI NHANH" title="Ghi một bữa ăn" description="Chụp ảnh, nói hoặc gõ thêm vài chữ. AI tạo bản nháp, bạn kiểm tra rồi lưu." />;

  if (stage.kind === "editor") return <>
    {heading}
    {info && <p className="feedback" role="status">{info}</p>}
    <DraftEditor initialItems={stage.items} warnings={stage.warnings} today={today} onCancel={() => setStage({ kind: "capture" })} />
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
        <textarea rows={4} maxLength={MAX_NOTE} value={note} onChange={event => setNote(event.target.value)} placeholder="Gõ hoặc bấm micro để nói" />
      </label>
      {speech.listening && <p className="small muted" role="status">Đang nghe… {speech.interim}</p>}
      {speech.error && <p className="error-message" role="alert">{speech.error}</p>}
      <div className="capture-actions">
        <button type="button" className={`button secondary ${speech.listening ? "listening" : ""}`} disabled={!speech.supported}
          aria-pressed={speech.listening} onClick={() => speech.listening ? speech.stop() : speech.start()}>
          {speech.listening ? <><MicOff size={18} /> Dừng nói</> : <><Mic size={18} /> Nói</>}
        </button>
        <button type="button" className="button" onClick={analyze} disabled={busy}><Sparkles size={18} /> {busy ? "AI đang phân tích…" : "Tạo bản nháp"}</button>
      </div>
      {!speech.supported && <p className="small muted">Trình duyệt này chưa hỗ trợ nói thành chữ; bạn vẫn gõ ghi chú được.</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <p className="small muted ai-privacy">Khi bấm “Tạo bản nháp”, ảnh và ghi chú được gửi tới OpenAI để ước tính. Kết quả chỉ là bản nháp, chỉ lưu khi bạn xác nhận.</p>
    </section>

    <section className="other-methods" aria-label="Cách nhập khác">
      <button type="button" className="method-chip" onClick={() => setStage({ kind: "editor", items: [emptyItem()], warnings: [], fromAi: false })}><Pencil size={18} /> Nhập thủ công</button>
      <span className="method-chip disabled" aria-disabled="true"><BookOpen size={18} /> Kho món <small>(sắp có)</small></span>
      <span className="method-chip disabled" aria-disabled="true"><ScanLine size={18} /> Quét nhãn <small>(sắp có)</small></span>
    </section>
  </>;
}
