import { QuickLog } from "@/features/quick-log/quick-log";
import { JobDraft } from "@/features/quick-log/job-draft";
import { resolveDay } from "@/features/meals/queries";
import { aiAllowedFor } from "@/lib/ai/access";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Ghi bữa ăn" };

// ?date=: ghi cho ngày đang xem (mặc định hôm nay). ?mode=manual|note từ bảng "+".
// ?open=<mã>: mỗi lần chọn từ bảng "+" tạo lại màn (nhận ảnh mới / đặt focus), kể cả khi đang ở sẵn trang này.
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string; open?: string; date?: string; job?: string }> }) {
  const { mode, open, date: requested, job } = await searchParams;
  // ?job=<id>: bản nháp của lần ghi AI chạy nền.
  if (job && /^[0-9a-f-]{36}$/i.test(job)) return <JobDraft key={job} jobId={job} />;
  const [{ date, defaultMealType }, { email }] = await Promise.all([resolveDay(requested), requireUser()]);
  return <QuickLog key={`${mode ?? "capture"}-${open ?? ""}-${date}`} today={date} defaultMealType={defaultMealType}
    start={mode === "manual" || mode === "note" ? mode : undefined} aiEnabled={aiAllowedFor(email)} />;
}
