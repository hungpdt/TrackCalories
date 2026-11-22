import { History } from "@/features/meals/history";
import { Suspense } from "react";
export const metadata = { title: "Nhật ký" };
export default function Page() { return <Suspense fallback={<p role="status">Đang mở nhật ký…</p>}><History /></Suspense>; }
