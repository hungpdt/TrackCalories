import { redirect } from "next/navigation";

// Nhật ký đã gộp vào Trang chủ (thanh tuần); giữ đường dẫn cũ cho link/bookmark.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = new URLSearchParams(Object.entries(await searchParams).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const query = params.toString();
  redirect(query ? `/?${query}` : "/");
}
