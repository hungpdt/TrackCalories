"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Heart, Minus, Pencil, Plus, Search, Trash2, Utensils } from "lucide-react";
import { EmptyState, PageHeading } from "@/components/ui/shared";
import { Sheet } from "@/components/ui/sheet";
import { mealTypeLabels, mealTypes, type SaveMealInput } from "@/lib/ai/draft";
import { formatNumber } from "@/lib/format";
import { availableUnits, portionTotals, type PortionUnit } from "@/lib/nutrition/portion";
import { parseDecimal } from "@/lib/nutrition/targets";
import { matchesQuery } from "@/lib/text/search";
import { uuid } from "@/lib/uuid";
import { deleteFood, logFood, setFavorite } from "./actions";
import { basisText, type LibraryFood } from "./types";

type Filter = "all" | "favorite" | "recent";
const unitLabel: Record<PortionUnit, string> = { g: "g", ml: "ml", serving: "khẩu phần", package: "gói" };
const presets: Record<PortionUnit, number[]> = { serving: [0.5, 1, 1.5, 2], package: [0.5, 1, 2], g: [50, 100, 150, 200, 300], ml: [100, 200, 250, 330, 500] };
const steps: Record<PortionUnit, number> = { serving: 0.5, package: 0.5, g: 10, ml: 10 };
const show = (value: number) => String(Math.round(value * 100) / 100).replace(".", ",");

export function FoodLibrary({ foods, today, defaultMealType }: { foods: LibraryFood[]; today: string; defaultMealType: SaveMealInput["mealType"] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"detail" | "amount">("detail");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = foods.find(food => food.id === selectedId) ?? null;

  const visible = useMemo(() => foods
    .filter(food => matchesQuery(food.name, query))
    .filter(food => filter === "all" || (filter === "favorite" ? food.isFavorite : Boolean(food.lastUsedAt))), [foods, query, filter]);

  function open(food: LibraryFood) { setSelectedId(food.id); setMode("detail"); setMessage(""); }
  function close() { setSelectedId(null); }

  function toggleFavorite(food: LibraryFood) {
    startTransition(async () => {
      try { await setFavorite(food.id, !food.isFavorite); router.refresh(); }
      catch { setMessage("Mất kết nối, chưa đổi được yêu thích."); }
    });
  }

  function remove(food: LibraryFood) {
    if (!window.confirm(`Xóa "${food.name}" khỏi kho? Các bữa đã ghi vẫn giữ nguyên số liệu.`)) return;
    startTransition(async () => {
      try {
        const result = await deleteFood(food.id);
        setMessage(result.ok ? `Đã xóa "${food.name}".` : "Chưa xóa được món. Thử lại.");
        if (result.ok) close();
        router.refresh();
      } catch { setMessage("Mất kết nối, chưa xóa được món."); }
    });
  }

  return <>
    <PageHeading eyebrow="MÓN QUEN, GHI NHANH" title="Kho món ăn" description="Món bạn hay ăn, chọn lại nhanh mà không cần AI."
      action={<Link className="button" href="/foods/new"><Plus size={18} /> Món mới</Link>} />
    <div className="filter-bar">
      <label className="search-field"><Search size={19} aria-hidden="true" />
        <input aria-label="Tìm món ăn" placeholder="Tìm món, gõ không dấu cũng được" value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      <div className="segmented" role="group" aria-label="Lọc món">
        {([["all", "Tất cả"], ["favorite", "Yêu thích"], ["recent", "Gần đây"]] as const).map(([key, label]) =>
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
      </div>
    </div>
    {message && <p role="status" className="feedback">{message}</p>}
    {foods.length === 0 ? <section className="card"><EmptyState title="Kho món đang trống"
      detail="Thêm món bạn hay ăn, hoặc tích “Lưu vào kho” khi kiểm tra bản nháp AI." action={<Link className="button" href="/foods/new"><Plus size={18} /> Món mới</Link>} /></section>
      : visible.length === 0 ? <section className="card"><EmptyState title="Không thấy món phù hợp" detail="Thử từ khóa khác hoặc chuyển sang Tất cả." /></section>
      : <ul className="food-list card">
        {visible.map(food => <li key={food.id}>
          <button type="button" className="food-row" onClick={() => open(food)}>
            <span className="food-symbol" aria-hidden="true"><Utensils size={18} /></span>
            <span className="food-row-main">
              <b>{food.isFavorite && <Heart size={14} className="favorite-mark" aria-label="Yêu thích" />}{food.name}</b>
              <span className="small muted">{basisText(food)} · {formatNumber(food.kcal)} kcal</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </li>)}
      </ul>}

    <Sheet open={Boolean(selected)} onClose={close} title={selected ? (mode === "detail" ? selected.name : `Ăn bao nhiêu ${selected.name}?`) : ""}>
      {selected && mode === "detail" && <div className="food-detail">
        <div className="food-detail-box">
          <span className="small muted">Dinh dưỡng cho {basisText(selected)}</span>
          <strong className="food-detail-kcal">{formatNumber(selected.kcal)} kcal</strong>
          <span>P {formatNumber(selected.protein)} g · C {formatNumber(selected.carbs)} g · F {formatNumber(selected.fat)} g</span>
        </div>
        <button type="button" className="button full-width" onClick={() => setMode("amount")}><Plus size={18} /> Thêm vào bữa</button>
        <div className="sheet-actions">
          <button type="button" className="button secondary" aria-pressed={selected.isFavorite} disabled={pending} onClick={() => toggleFavorite(selected)}>
            <Heart size={16} fill={selected.isFavorite ? "currentColor" : "none"} /> {selected.isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
          </button>
          <Link className="button secondary" href={`/foods/${selected.id}/edit`}><Pencil size={16} /> Sửa</Link>
          <button type="button" className="button secondary" disabled={pending} onClick={() => remove(selected)}><Trash2 size={16} /> Xóa</button>
        </div>
        <p className="small muted">Sửa hoặc xóa món không làm đổi các bữa đã ghi trước đó.</p>
      </div>}
      {selected && mode === "amount" && <AmountPicker key={selected.id} food={selected} today={today} defaultMealType={defaultMealType} onBack={() => setMode("detail")} />}
    </Sheet>
  </>;
}

function AmountPicker({ food, today, defaultMealType, onBack }: { food: LibraryFood; today: string; defaultMealType: SaveMealInput["mealType"]; onBack: () => void }) {
  const router = useRouter();
  const units = availableUnits(food);
  const [unit, setUnit] = useState<PortionUnit>(units[0]);
  const [quantity, setQuantity] = useState(unit === "g" || unit === "ml" ? "100" : "1");
  const [mealType, setMealType] = useState(defaultMealType);
  const [mealDate, setMealDate] = useState(today);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const lastAttempt = useRef<{ json: string; id: string } | null>(null);
  const amount = quantity.trim() ? parseDecimal(quantity) : Number.NaN;
  const totals = portionTotals(food, amount, unit);
  const unitText = unit === "serving" && food.servingLabel ? food.servingLabel.replace(/^1\s*/, "") : unitLabel[unit];

  function changeUnit(next: PortionUnit) {
    setUnit(next);
    setQuantity(next === "g" || next === "ml" ? "100" : "1");
  }

  function nudge(direction: 1 | -1) {
    const current = Number.isFinite(amount) ? amount : 0;
    const next = Math.max(steps[unit], Math.round((current + direction * steps[unit]) * 100) / 100);
    setQuantity(show(next));
  }

  function save() {
    if (!totals) { setError("Nhập lượng ăn lớn hơn 0 (dùng dấu phẩy cho số thập phân, ví dụ 1,5)."); return; }
    const payload = { foodId: food.id, quantity: amount, unit, mealDate, mealType };
    const json = JSON.stringify(payload);
    if (lastAttempt.current?.json !== json) lastAttempt.current = { json, id: uuid() };
    const requestId = lastAttempt.current.id;
    setError("");
    startSaving(async () => {
      try {
        const result = await logFood({ ...payload, requestId });
        if (!result.ok) { setError(result.error); return; }
        router.push(`/?date=${result.mealDate}&saved=1`);
      } catch {
        setError("Mất kết nối khi lưu. Bấm lưu lại; bữa sẽ không bị ghi trùng.");
      }
    });
  }

  return <div className="amount-picker">
    {units.length > 1 && <div className="segmented" role="group" aria-label="Đơn vị">
      {units.map(item => <button key={item} type="button" aria-pressed={unit === item} onClick={() => changeUnit(item)}>{unitLabel[item]}</button>)}
    </div>}
    <div className="amount-stepper">
      <button type="button" className="button secondary" aria-label="Bớt" onClick={() => nudge(-1)}><Minus size={18} /></button>
      <label className="amount-input"><span className="sr-only">Lượng ăn ({unitText})</span>
        <input inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} aria-label={`Lượng ăn (${unitText})`} />
        <span>{unitText}</span>
      </label>
      <button type="button" className="button secondary" aria-label="Thêm" onClick={() => nudge(1)}><Plus size={18} /></button>
    </div>
    <div className="chip-row">{presets[unit].map(value =>
      <button key={value} type="button" className="chip" aria-pressed={amount === value} onClick={() => setQuantity(show(value))}>{value === 0.5 ? "½" : show(value)}</button>)}</div>
    <p className="amount-total" aria-live="polite">{totals
      ? <><b>{formatNumber(totals.kcal)} kcal</b> <span className="muted">· P {formatNumber(totals.protein)} · C {formatNumber(totals.carbs)} · F {formatNumber(totals.fat)} g</span></>
      : <span className="muted">Nhập lượng ăn để tính.</span>}</p>
    <div className="chip-row" role="group" aria-label="Bữa ăn">{mealTypes.map(type =>
      <button key={type} type="button" className="chip" aria-pressed={mealType === type} onClick={() => setMealType(type)}>{mealTypeLabels[type]}</button>)}</div>
    <label className="field">Ngày ăn<input type="date" value={mealDate} onChange={event => setMealDate(event.target.value)} /></label>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="sheet-actions">
      <button type="button" className="button secondary" onClick={onBack}>Quay lại</button>
      <button type="button" className="button" disabled={saving} onClick={save}>{saving ? "Đang lưu…" : "Lưu vào nhật ký"}</button>
    </div>
  </div>;
}
