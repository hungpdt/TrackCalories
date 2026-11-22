import Link from "next/link";
import { Plus, Utensils, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { formatNumber, type Meal } from "@/lib/demo/data";
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div><div className="heading-action">{action}</div></div>;
}
export function AddMealLink() { return <Link href="/add-meal" className="button"><Plus size={18} /> Ghi bữa ăn</Link>; }
export function DatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className="date-picker"><span className="sr-only">Ngày xem nhật ký</span><input aria-label="Ngày xem nhật ký" type="date" value={value} onChange={event => { if (event.target.value) onChange(event.target.value); }} /></label>; }
export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="empty-state"><span className="empty-icon"><Utensils size={28} /></span><h3>{title}</h3><p className="muted">{detail}</p>{action}</div>; }
export function MealList({ meals, onDelete }: { meals: Meal[]; onDelete?: (id: string) => void }) {
  return <div className="meal-list">{meals.map(meal => <article key={meal.id} className="meal-row"><span className="food-symbol"><Utensils size={21} /></span><div className="meal-info"><span className="small muted">{meal.type}</span><h3>{meal.name}</h3><p>{meal.serving} <span className="meal-macros">· P {formatNumber(meal.protein)} · C {formatNumber(meal.carbs)} · F {formatNumber(meal.fat)} g</span></p></div><div className="meal-energy"><strong>{formatNumber(meal.kcal)}</strong><span>kcal</span></div>{onDelete && <button className="icon-button" aria-label={`Xóa ${meal.name}`} onClick={() => onDelete(meal.id)}><Trash2 size={18} /></button>}</article>)}</div>;
}
