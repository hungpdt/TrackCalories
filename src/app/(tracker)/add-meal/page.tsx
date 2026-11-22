import { QuickLog } from "@/features/quick-log/quick-log";
import { emptyItemFromDemoFood } from "@/features/quick-log/prefill";
import { resolveDay } from "@/features/meals/queries";

export const metadata = { title: "Ghi bữa ăn" };

export default async function Page({ searchParams }: { searchParams: Promise<{ food?: string }> }) {
  const { today } = await resolveDay(undefined);
  const prefill = emptyItemFromDemoFood((await searchParams).food);
  return <QuickLog today={today} prefill={prefill} />;
}
