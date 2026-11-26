"use client";

import Link from "next/link";
import { RotateCcw, Sparkles, Utensils, X } from "lucide-react";
import { estimatedPercent, useAiJobs, useNow, type AiJob } from "./ai-jobs";

const SIZE = 52;
const STROKE = 5;

/** Thẻ của một lần ghi bằng AI trong danh sách trang chủ: đang phân tích (vòng %), xong (bấm để kiểm tra) hoặc lỗi. */
export function AiJobCard({ job }: { job: AiJob }) {
  const { retry, dismiss, canRetry } = useAiJobs();
  const now = useNow(job.status === "running");
  const percent = job.status === "running" ? estimatedPercent(job.startedAt, now) : 100;
  const radius = (SIZE - STROKE) / 2;
  const length = 2 * Math.PI * radius;

  const thumb = <span className={`meal-thumb ai-job-thumb${job.status === "running" ? " running" : ""}`}>
    {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước cục bộ (data URL) */}
    {job.photo ? <img src={job.photo} alt="" /> : <Utensils size={22} aria-hidden="true" />}
    {job.status === "running" && <span className="ai-job-ring" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={radius} strokeWidth={STROKE} className="ring-track" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={radius} strokeWidth={STROKE} className="ring-value" strokeDasharray={length} strokeDashoffset={length * (1 - percent / 100)} />
      </svg>
      <b>{percent}%</b>
    </span>}
  </span>;

  if (job.status === "running") return <li className="ai-job-card" aria-live="polite">
    {thumb}
    <span className="meal-card-body">
      <strong className="ai-job-title">Đang phân tích bữa ăn…</strong>
      <span className="small muted">Bạn có thể làm việc khác, bản nháp sẽ hiện ở đây.</span>
      <span className="ai-job-bars" aria-hidden="true"><i /><i /><i /></span>
    </span>
  </li>;

  if (job.status === "done") return <li className="ai-job-card ready">
    {thumb}
    <span className="meal-card-body">
      <Link href={`/add-meal?job=${job.id}`} className="ai-job-title meal-card-title"><Sparkles size={16} aria-hidden="true" /> Bản nháp sẵn sàng</Link>
      <span className="small muted">{job.draft?.items.map(item => item.name).slice(0, 3).join(", ")}{(job.draft?.items.length ?? 0) > 3 ? "…" : ""} · bấm để kiểm tra và lưu</span>
    </span>
    <button type="button" className="icon-button ai-job-dismiss" aria-label="Bỏ bản nháp" onClick={() => dismiss(job.id)}><X size={18} /></button>
  </li>;

  return <li className="ai-job-card failed">
    {thumb}
    <span className="meal-card-body">
      <strong className="ai-job-title">Chưa phân tích được</strong>
      <span className="small" role="alert">{job.error}</span>
      <span className="ai-job-actions">
        {canRetry(job.id) && <button type="button" className="button secondary" onClick={() => retry(job.id)}><RotateCcw size={16} /> Thử lại</button>}
        <Link className="button secondary" href={`/add-meal?mode=manual&date=${job.date}`} onClick={() => dismiss(job.id)}>Nhập thủ công</Link>
      </span>
    </span>
    <button type="button" className="icon-button ai-job-dismiss" aria-label="Bỏ" onClick={() => dismiss(job.id)}><X size={18} /></button>
  </li>;
}
