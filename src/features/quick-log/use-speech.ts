"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Kiểu tối thiểu cho Web Speech API (Chrome/Edge dùng tiền tố webkit); không phải trình duyệt nào cũng có.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const errorMessages: Record<string, string> = {
  "not-allowed": "Chưa có quyền dùng micro. Cho phép micro trong cài đặt trình duyệt hoặc gõ ghi chú.",
  "service-not-allowed": "Trình duyệt chặn nhận dạng giọng nói. Hãy gõ ghi chú.",
  "no-speech": "Không nghe thấy giọng nói. Thử lại hoặc gõ ghi chú.",
  "audio-capture": "Không tìm thấy micro. Hãy gõ ghi chú.",
  network: "Nhận dạng giọng nói cần mạng. Thử lại hoặc gõ ghi chú.",
};

/** Nói → văn bản tiếng Việt; chỉ xin quyền micro khi người dùng bấm nói. Kết quả do người dùng sửa trước khi gửi. */
export type SpeechAvailability = "available" | "insecure" | "unsupported" | "unknown";

function availability(): SpeechAvailability {
  if (!getCtor()) return "unsupported";
  // Micro chỉ được phép trên HTTPS/localhost; ở http://192.168.x.x trình duyệt luôn từ chối.
  return window.isSecureContext ? "available" : "insecure";
}

export function useSpeech(onFinal: (text: string) => void) {
  const status = useSyncExternalStore<SpeechAvailability>(() => () => {}, availability, () => "unknown");
  const supported = status === "available";
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
    setInterim("");
  }, []);
  // Rời màn hoặc unmount: tắt micro để không ghi âm ngầm.
  useEffect(() => () => recognition.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) { setError("Trình duyệt này chưa hỗ trợ nhập bằng giọng nói. Hãy gõ ghi chú hoặc dùng nút micro trên bàn phím điện thoại."); return; }
    if (!window.isSecureContext) {
      setError("Không dùng được nút Nói khi mở app qua http (ví dụ http://192.168.x.x). Trình duyệt chỉ cho dùng micro trên HTTPS. Hãy bấm biểu tượng micro trên bàn phím điện thoại để đọc vào ô ghi chú.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "vi-VN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = event => {
      let pending = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (result.isFinal) onFinal(result[0].transcript.trim());
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    const finish = () => { setListening(false); setInterim(""); if (recognition.current === rec) recognition.current = null; };
    rec.onerror = event => {
      if (event.error !== "aborted") setError(errorMessages[event.error] ?? "Nhận dạng giọng nói bị lỗi. Hãy gõ ghi chú.");
      // Một số trình duyệt không gửi onend sau lỗi quyền micro: tự kết thúc để nút không kẹt ở "Dừng nói".
      finish();
    };
    rec.onend = finish;
    recognition.current = rec;
    setError("");
    try { rec.start(); setListening(true); } catch { setError("Chưa bắt đầu được ghi âm. Thử lại."); }
  }, [onFinal]);

  return { status, supported, listening, interim, error, start, stop };
}
