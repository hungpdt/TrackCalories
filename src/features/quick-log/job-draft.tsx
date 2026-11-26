"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/shared";
import { dataUrlToBlob, estimatedPercent, useAiJobs, useNow } from "./ai-jobs";
import { DraftEditor, itemFromAi } from "./draft-editor";

/** Mở bản nháp của một lần ghi AI chạy nền (/add-meal?job=<id>) để kiểm tra và lưu. */
export function JobDraft({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { jobs, loaded, dismiss } = useAiJobs();
  const job = jobs.find(item => item.id === jobId);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const now = useNow(job?.status === "running");

  useEffect(() => {
    if (!job?.photo) return;
    let active = true;
    void dataUrlToBlob(job.photo).then(blob => { if (active) setPhoto(blob); }).catch(() => undefined);
    return () => { active = false; };
  }, [job?.photo]);

  const heading = <PageHeading eyebrow="GHI NHANH" title="Bản nháp từ AI" description="AI đã ước tính từng món. Sửa số nếu cần rồi lưu." />;
  if (!loaded) return heading;
  if (!job) return <>{heading}<section className="card"><p>Không còn bản nháp này (đã lưu, đã bỏ hoặc phiên đã đóng).</p><Link className="button secondary" href="/">Về trang chủ</Link></section></>;
  if (job.status === "running") return <>{heading}<section className="card" role="status"><p>AI đang phân tích… {estimatedPercent(job.startedAt, now)}%</p><p className="small muted">Bạn có thể quay lại sau; bản nháp sẽ hiện ở trang chủ.</p><Link className="button secondary" href={`/?date=${job.date}`}>Về trang chủ</Link></section></>;
  if (job.status === "error" || !job.draft) return <>{heading}<section className="card"><p className="error-message" role="alert">{job.error ?? "Chưa phân tích được."}</p><Link className="button secondary" href={`/?date=${job.date}`}>Về trang chủ</Link></section></>;

  return <>
    {heading}
    {typeof job.remaining === "number" && <p className="feedback" role="status">Còn {job.remaining} lượt AI hôm nay.</p>}
    <DraftEditor key={job.id} initialItems={job.draft.items.map(itemFromAi)} warnings={job.draft.warnings} today={job.date} defaultMealType={job.mealType}
      photo={photo} persistKey={`job-${job.id}`} onSaved={() => dismiss(job.id)} onCancel={() => router.push(`/?date=${job.date}`)} />
  </>;
}
