import { QuickLog } from "@/features/quick-log/quick-log";
import { resolveDay } from "@/features/meals/queries";

export const metadata = { title: "Ghi bữa ăn" };

// ?date=: ghi cho ngày đang xem (mặc định hôm nay). ?mode=manual|note từ bảng "+".
// ?open=<mã>: mỗi lần chọn từ bảng "+" tạo lại màn (nhận ảnh mới / đặt focus), kể cả khi đang ở sẵn trang này.
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string; open?: string; date?: string }> }) {
  const { mode, open, date: requested } = await searchParams;
  const { date, defaultMealType } = await resolveDay(requested);
  return <QuickLog key={`${mode ?? "capture"}-${open ?? ""}-${date}`} today={date} defaultMealType={defaultMealType}
    start={mode === "manual" || mode === "note" ? mode : undefined} />;
}
