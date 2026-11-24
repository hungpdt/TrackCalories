import Link from "next/link";
import { Plus, Utensils } from "lucide-react";
import type { ReactNode } from "react";
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div><div className="heading-action">{action}</div></div>;
}
/** Ghi bữa cho ngày đang xem (không truyền date thì là hôm nay). */
export function addMealHref(date?: string) { return date ? `/add-meal?date=${date}` : "/add-meal"; }
export function AddMealLink({ date }: { date?: string }) { return <Link href={addMealHref(date)} className="button add-meal-link"><Plus size={18} /> Ghi bữa ăn</Link>; }
export function DatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className="date-picker"><span className="sr-only">Ngày xem nhật ký</span><input aria-label="Ngày xem nhật ký" type="date" value={value} onChange={event => { if (event.target.value) onChange(event.target.value); }} /></label>; }
export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="empty-state"><span className="empty-icon"><Utensils size={28} /></span><h3>{title}</h3><p className="muted">{detail}</p>{action}</div>; }
