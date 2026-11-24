import { FoodLibrary } from "@/features/foods/food-library";
import { listFoods } from "@/features/foods/queries";
import { resolveDay } from "@/features/meals/queries";

export const metadata = { title: "Kho món ăn" };

// ?date=: thêm món vào ngày đang xem (từ bảng "+" hoặc màn Ghi nhanh), mặc định hôm nay.
export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [foods, { date, defaultMealType }] = await Promise.all([listFoods(), resolveDay((await searchParams).date)]);
  return <FoodLibrary foods={foods} today={date} defaultMealType={defaultMealType} />;
}
