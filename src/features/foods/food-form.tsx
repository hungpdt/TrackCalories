"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/shared";
import type { BasisType } from "@/lib/nutrition/portion";
import { looksLikeThousands, parseDecimal } from "@/lib/nutrition/targets";
import { createFood, updateFood } from "./actions";
import { basisLabels, type FoodInput, type LibraryFood } from "./types";

const show = (value: number | null | undefined) => value === null || value === undefined ? "" : String(value).replace(".", ",");

export function FoodForm({ food }: { food?: LibraryFood }) {
  const router = useRouter();
  const [name, setName] = useState(food?.name ?? "");
  const [basisType, setBasisType] = useState<BasisType>(food?.basisType ?? "per_serving");
  const [servingLabel, setServingLabel] = useState(food?.servingLabel ?? "");
  const [servingMass, setServingMass] = useState(show(food?.servingMassG));
  const [values, setValues] = useState({ kcal: show(food?.kcal), protein: show(food?.protein), carbs: show(food?.carbs), fat: show(food?.fat) });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const perServing = basisType === "per_serving" || basisType === "per_package";

  const number = (value: string) => value.trim() ? parseDecimal(value) : Number.NaN;
  const bad = (value: string) => !(Number.isFinite(number(value)) && number(value) >= 0);
  const mass = servingMass.trim() ? parseDecimal(servingMass) : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const all = [values.kcal, values.protein, values.carbs, values.fat];
    if (all.some(looksLikeThousands) || (servingMass && looksLikeThousands(servingMass))) { setError("Không dùng dấu chấm ngăn cách hàng nghìn; nhập 1200 thay cho 1.200."); return; }
    if (!name.trim() || all.some(bad) || (mass !== null && !(Number.isFinite(mass) && mass > 0))) {
      setError("Điền tên món và đủ kcal, protein, carb, chất béo (ô trống là chưa biết, không phải 0)."); return;
    }
    const input: FoodInput = {
      name: name.trim(), basisType, servingLabel: perServing ? servingLabel.trim() || null : null,
      servingMassG: perServing ? mass : null, servingVolumeMl: null,
      kcal: number(values.kcal), protein: number(values.protein), carbs: number(values.carbs), fat: number(values.fat),
    };
    setError("");
    startSaving(async () => {
      try {
        const result = food ? await updateFood(food.id, input) : await createFood(input);
        if (!result.ok) { setError(result.error); return; }
        router.push("/foods");
        router.refresh();
      } catch { setError("Mất kết nối, chưa lưu được. Thông tin vẫn còn, hãy thử lại."); }
    });
  }

  const invalid = (show: boolean) => submitted && show ? true : undefined;

  return <>
    <PageHeading eyebrow="KHO MÓN" title={food ? "Sửa món" : "Món mới"} description={food ? "Thay đổi chỉ áp dụng cho lần chọn sau; bữa đã ghi giữ nguyên." : "Lưu món bạn hay ăn để lần sau chọn nhanh."} />
    <form className="card food-form" onSubmit={submit} noValidate>
      <label className="field">Tên món<input value={name} maxLength={120} aria-invalid={invalid(!name.trim())} placeholder="Ví dụ: Phở bò" onChange={event => setName(event.target.value)} /></label>
      <fieldset className="field basis-field">
        <legend>Số liệu tính cho</legend>
        <div className="chip-row">{(Object.keys(basisLabels) as BasisType[]).map(type =>
          <button key={type} type="button" className="chip" aria-pressed={basisType === type} onClick={() => setBasisType(type)}>{basisLabels[type]}</button>)}</div>
      </fieldset>
      {perServing && <div className="form-row">
        <label className="field">{basisType === "per_package" ? "Tên gói (tùy chọn)" : "Tên khẩu phần (tùy chọn)"}
          <input value={servingLabel} maxLength={60} placeholder={basisType === "per_package" ? "1 gói" : "1 tô, 1 đĩa…"} onChange={event => setServingLabel(event.target.value)} /></label>
        <label className="field">Khoảng bao nhiêu gram (tùy chọn)
          <input inputMode="decimal" value={servingMass} placeholder="Ví dụ 500" aria-invalid={invalid(mass !== null && !(Number.isFinite(mass) && mass > 0))} onChange={event => setServingMass(event.target.value)} />
          <span className="field-hint">Biết gram thì lần sau nhập theo gram được.</span></label>
      </div>}
      <div className="nutrient-inputs">
        {([["kcal", "Calories (kcal)"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fat", "Chất béo (g)"]] as const).map(([key, label]) =>
          <label key={key} className="field">{label}
            <input inputMode="decimal" value={values[key]} placeholder="Cần nhập" aria-invalid={invalid(bad(values[key]))}
              onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} /></label>)}
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="setup-actions">
        <Link className="button secondary" href="/foods">Hủy</Link>
        <button type="submit" className="button" disabled={saving}>{saving ? "Đang lưu…" : food ? "Lưu thay đổi" : "Lưu vào kho"}</button>
      </div>
    </form>
  </>;
}
