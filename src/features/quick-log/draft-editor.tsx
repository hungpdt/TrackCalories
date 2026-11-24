"use client";

import { uuid } from "@/lib/uuid";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { mealTypeLabels, mealTypes, type AiItem, type SaveMealInput } from "@/lib/ai/draft";
import { formatNumber } from "@/lib/demo/data";
import { parseDecimal } from "@/lib/nutrition/targets";
import { saveMeal } from "./actions";

type Values = { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };
export type EditorItem = {
  key: string; name: string; grams: string; portionNote: string;
  kcal: string; protein: string; carbs: string; fat: string;
  source: "ai_estimate" | "manual"; needsReview: boolean; assumptions: string[];
  /** Gram và dinh dưỡng tại lần tính gần nhất, để tính lại theo tỉ lệ khi người dùng đổi gram. */
  basis: { grams: number | null } & Values;
};

const show = (value: number | null) => value === null ? "" : String(value).replace(".", ",");
const num = (value: string) => value.trim() ? parseDecimal(value) : null;
const newKey = () => uuid();

export function itemFromAi(item: AiItem): EditorItem {
  return {
    key: newKey(), name: item.name, grams: show(item.quantity_g), portionNote: item.portion_note ?? "",
    kcal: show(item.kcal), protein: show(item.protein_g), carbs: show(item.carbs_g), fat: show(item.fat_g),
    source: "ai_estimate", needsReview: item.needs_review, assumptions: item.assumptions,
    basis: { grams: item.quantity_g, kcal: item.kcal, protein: item.protein_g, carbs: item.carbs_g, fat: item.fat_g },
  };
}

export function emptyItem(prefill?: Partial<EditorItem>): EditorItem {
  return {
    key: newKey(), name: "", grams: "", portionNote: "", kcal: "", protein: "", carbs: "", fat: "",
    source: "manual", needsReview: false, assumptions: [], basis: { grams: null, kcal: null, protein: null, carbs: null, fat: null },
    ...prefill,
  };
}

/** Gram đã đổi so với lần tính gần nhất mà người dùng chưa chọn tính lại hay giữ số (PRD mục 5, A07). */
function gramsPending(item: EditorItem) {
  const grams = num(item.grams);
  return Boolean(grams && Number.isFinite(grams) && item.basis.grams && grams !== item.basis.grams && item.basis.kcal !== null);
}

/** Lỗi của từng món; rỗng nghĩa là món hợp lệ để lưu. */
function problems(item: EditorItem) {
  const list: string[] = [];
  if (!item.name.trim()) list.push("tên món");
  const grams = num(item.grams);
  if (grams !== null && !(Number.isFinite(grams) && grams > 0 && grams <= 5000)) list.push("gram (0–5000)");
  const checks: [string, string, number][] = [["kcal", item.kcal, 10000], ["protein", item.protein, 2000], ["carb", item.carbs, 2000], ["chất béo", item.fat, 2000]];
  for (const [label, value, max] of checks) {
    const parsed = num(value);
    if (parsed === null || !Number.isFinite(parsed) || parsed < 0 || parsed > max) list.push(label);
  }
  return list;
}

export function DraftEditor({ initialItems, today, defaultMealType, warnings = [], onCancel }: {
  initialItems: EditorItem[]; today: string; defaultMealType: SaveMealInput["mealType"]; warnings?: string[]; onCancel?: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [mealDate, setMealDate] = useState(today);
  const [mealType, setMealType] = useState<SaveMealInput["mealType"]>(defaultMealType);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, startSaving] = useTransition();
  const lastAttempt = useRef<{ json: string; id: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Màn đổi từ chụp ảnh sang bản nháp: đưa focus tới tiêu đề cho bàn phím/trình đọc màn hình.
  useEffect(() => { heading.current?.focus(); }, []);

  const update = (key: string, patch: Partial<EditorItem>) => setItems(current => current.map(item => item.key === key ? { ...item, ...patch } : item));

  function recalc(item: EditorItem) {
    const grams = num(item.grams);
    const { basis } = item;
    if (!grams || !basis.grams) return;
    const ratio = grams / basis.grams;
    const scale = (value: number | null) => value === null ? null : Math.round(value * ratio * 10) / 10;
    const next = { kcal: scale(basis.kcal), protein: scale(basis.protein), carbs: scale(basis.carbs), fat: scale(basis.fat) };
    update(item.key, { kcal: show(next.kcal), protein: show(next.protein), carbs: show(next.carbs), fat: show(next.fat), basis: { grams, ...next } });
  }

  /** Giữ đúng số người dùng đang thấy cho gram mới (ghi đè có chủ đích). */
  function keepNumbers(item: EditorItem) {
    update(item.key, { basis: { grams: num(item.grams), kcal: num(item.kcal), protein: num(item.protein), carbs: num(item.carbs), fat: num(item.fat) } });
  }

  const totals = items.reduce((sum, item) => ({
    kcal: sum.kcal + (num(item.kcal) || 0), protein: sum.protein + (num(item.protein) || 0),
    carbs: sum.carbs + (num(item.carbs) || 0), fat: sum.fat + (num(item.fat) || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  function save() {
    setSubmitted(true);
    if (!items.length) { setError("Thêm ít nhất một món."); return; }
    if (items.some(item => problems(item).length)) { setError("Bổ sung các ô được đánh dấu trước khi lưu. Ô trống nghĩa là chưa biết, không phải 0."); return; }
    if (items.some(gramsPending)) { setError("Có món đã đổi gram: chọn “Tính lại” hoặc “Giữ số đã nhập” trước khi lưu."); return; }
    if (!mealDate) { setError("Chọn ngày ăn."); return; }
    const payload: Omit<SaveMealInput, "requestId"> = {
      mealDate, mealType,
      items: items.map(item => ({
        name: item.name.trim(), grams: num(item.grams), portionNote: item.portionNote.trim() || null,
        kcal: num(item.kcal)!, protein_g: num(item.protein)!, carbs_g: num(item.carbs)!, fat_g: num(item.fat)!,
        source: item.source, assumptions: item.assumptions,
      })),
    };
    // Cùng nội dung → cùng request_id (retry không tạo trùng); nội dung đổi → request mới.
    const json = JSON.stringify(payload);
    if (lastAttempt.current?.json !== json) lastAttempt.current = { json, id: uuid() };
    const requestId = lastAttempt.current.id;
    setError("");
    startSaving(async () => {
      try {
        const result = await saveMeal({ ...payload, requestId });
        if (!result.ok) { setError(result.error); return; }
        router.push(`/history?date=${result.mealDate}`);
      } catch {
        // Mất mạng/lỗi server: giữ nguyên bản nháp; bấm lại dùng cùng request_id nên không tạo trùng.
        setError("Mất kết nối khi lưu. Bản nháp vẫn được giữ, hãy bấm lưu lại.");
      }
    });
  }

  return <section className="card draft-editor" aria-labelledby="draft-title">
    <div className="section-heading">
      <h2 id="draft-title" ref={heading} tabIndex={-1}>Kiểm tra bản nháp</h2>
      {items.some(item => item.source === "ai_estimate") && <span className="tag estimate-tag">Ước tính AI</span>}
    </div>
    {warnings.length > 0 && <ul className="draft-warnings">{warnings.map(w => <li key={w}><AlertTriangle size={16} aria-hidden="true" /> {w}</li>)}</ul>}
    <div className="form-row">
      <label className="field">Ngày ăn<input type="date" required value={mealDate} onChange={event => setMealDate(event.target.value)} /></label>
      <label className="field">Bữa ăn
        <select value={mealType} onChange={event => setMealType(event.target.value as SaveMealInput["mealType"])}>
          {mealTypes.map(type => <option key={type} value={type}>{mealTypeLabels[type]}</option>)}
        </select>
      </label>
    </div>
    <p className="small muted">Các số là dinh dưỡng cho <b>đúng lượng bạn ăn</b> của từng món (không phải trên 100 g).</p>
    <ol className="draft-items">
      {items.map((item, index) => {
        const issues = submitted ? problems(item) : [];
        const grams = num(item.grams);
        const canRecalc = gramsPending(item);
        const invalid = (label: string) => issues.includes(label) ? true : undefined;
        return <li key={item.key} className={`draft-item ${item.needsReview ? "needs-review" : ""}`}>
          <div className="draft-item-head">
            <span className="draft-index">{index + 1}</span>
            {item.needsReview && <span className="tag review-tag"><AlertTriangle size={14} aria-hidden="true" /> Cần kiểm tra</span>}
            <button type="button" className="icon-button" aria-label={`Bỏ món ${item.name || index + 1}`} onClick={() => setItems(current => current.filter(other => other.key !== item.key))}><Trash2 size={18} /></button>
          </div>
          <label className="field">Tên món<input value={item.name} maxLength={120} aria-invalid={invalid("tên món")} onChange={event => update(item.key, { name: event.target.value })} /></label>
          <div className="form-row">
            <label className="field">Gram ăn (tùy chọn)<input inputMode="decimal" value={item.grams} aria-invalid={invalid("gram (0–5000)")} placeholder="Ví dụ 200" onChange={event => update(item.key, { grams: event.target.value })} /></label>
            <label className="field">Khẩu phần (tùy chọn)<input value={item.portionNote} maxLength={60} placeholder="Ví dụ 1 tô" onChange={event => update(item.key, { portionNote: event.target.value })} /></label>
          </div>
          {canRecalc && <div className="recalc" role="group" aria-label="Gram đã đổi">
            <p className="small">Đã đổi gram. Dinh dưỡng bên dưới vẫn theo {formatNumber(item.basis.grams!)} g.</p>
            <button type="button" className="button secondary" onClick={() => recalc(item)}><RotateCcw size={16} /> Tính lại dinh dưỡng theo {formatNumber(grams!)} g</button>
            <button type="button" className="button secondary" onClick={() => keepNumbers(item)}>Giữ số đã nhập</button>
          </div>}
          <div className="nutrient-inputs">
            {([["kcal", "Calories (kcal)", "kcal"], ["protein", "Protein (g)", "protein"], ["carbs", "Carbs (g)", "carb"], ["fat", "Chất béo (g)", "chất béo"]] as const).map(([field, label, issue]) =>
              <label key={field} className="field">{label}
                <input inputMode="decimal" value={item[field]} aria-invalid={invalid(issue)} placeholder="Cần nhập"
                  onChange={event => update(item.key, { [field]: event.target.value })} />
              </label>)}
          </div>
          {item.assumptions.length > 0 && <details className="draft-assumptions"><summary>Giả định của AI</summary><ul>{item.assumptions.map(a => <li key={a}>{a}</li>)}</ul></details>}
          {issues.length > 0 && <p className="error-message" role="alert">Cần bổ sung: {issues.join(", ")}.</p>}
        </li>;
      })}
    </ol>
    <button type="button" className="dashed-button full-width" onClick={() => setItems(current => [...current, emptyItem()])}><Plus size={16} /> Thêm món</button>
    <div className="draft-total">
      <span>Tổng bữa</span>
      <strong>{formatNumber(totals.kcal)} kcal</strong>
      <span className="muted">P {formatNumber(totals.protein)} · C {formatNumber(totals.carbs)} · F {formatNumber(totals.fat)} g</span>
    </div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="setup-actions">
      {onCancel && <button type="button" className="button secondary" onClick={onCancel}>Quay lại</button>}
      <button type="button" className="button" onClick={save} disabled={saving}><Check size={18} /> {saving ? "Đang lưu…" : "Xác nhận lưu bữa"}</button>
    </div>
  </section>;
}
