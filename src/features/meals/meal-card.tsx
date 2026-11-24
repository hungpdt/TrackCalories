"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Flame, Trash2, Utensils } from "lucide-react";
import { deleteMeal } from "@/features/quick-log/actions";
import { mealTypeLabels } from "@/lib/ai/draft";
import { formatNumber } from "@/lib/format";
import type { DayMeal } from "./types";

const ACTION_WIDTH = 88;

/** Một dòng P/C/F có chấm màu, dùng chung cho thẻ và trang chi tiết. */
export function MacroLine({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  return <span className="macro-line">
    <span className="protein"><i aria-hidden="true" />P {formatNumber(protein)}g</span>
    <span className="carbs"><i aria-hidden="true" />C {formatNumber(carbs)}g</span>
    <span className="fat"><i aria-hidden="true" />F {formatNumber(fat)}g</span>
  </span>;
}

/** Tên hiển thị của một lần ghi: một món thì tên món, nhiều món thì "Món đầu + n món". */
export function mealTitle(meal: DayMeal) {
  if (!meal.items.length) return mealTypeLabels[meal.mealType];
  return meal.items.length === 1 ? meal.items[0].name : `${meal.items[0].name} +${meal.items.length - 1} món`;
}

/**
 * Thẻ một lần ghi trong "Gần đây". Quẹt trái để lộ nút Xóa (bàn phím: Tab tới nút Xóa cũng làm lộ nút).
 * Chạm không kéo thì mở trang chi tiết bữa (link phủ cả thẻ).
 */
export function MealCard({ meal }: { meal: DayMeal }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const suppressClick = useRef(false);
  const drag = useRef<{ x: number; y: number; base: number; moved: boolean; horizontal: boolean | null } | null>(null);

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, base: offset, moved: false, horizontal: null };
  }
  function onPointerMove(event: PointerEvent) {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    // Chỉ coi là quẹt ngang khi hướng ngang rõ hơn dọc; còn lại để trang cuộn bình thường.
    if (state.horizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) state.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!state.horizontal) return;
    state.moved = true;
    setDragging(true);
    setOffset(Math.max(-ACTION_WIDTH - 24, Math.min(0, state.base + dx)));
  }
  function onPointerUp() {
    const state = drag.current;
    drag.current = null;
    setDragging(false);
    if (!state) return;
    if (state.moved) { suppressClick.current = true; setOffset(current => current < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0); return; }
    // Đang lộ nút Xóa: chạm vào thẻ chỉ đóng lại, không mở chi tiết.
    if (offset !== 0) { suppressClick.current = true; setOffset(0); }
  }

  function remove() {
    if (!window.confirm(`Xóa “${mealTitle(meal)}” (${formatNumber(meal.totals.kcal)} kcal)? Thao tác này không hoàn tác được.`)) { setOffset(0); return; }
    startTransition(async () => {
      try {
        const result = await deleteMeal(meal.id);
        if (!result.ok) { setError("Chưa xóa được. Thử lại."); return; }
        router.refresh();
      } catch {
        setError("Mất kết nối, chưa xóa được. Thử lại.");
      }
    });
  }

  return <li className={`meal-card-wrap${pending ? " removing" : ""}`}>
    <button type="button" className="meal-card-delete" onClick={remove} disabled={pending} style={{ opacity: offset < 0 ? 1 : 0 }} onFocus={() => setOffset(-ACTION_WIDTH)} onBlur={() => setOffset(0)}
      aria-label={`Xóa ${mealTitle(meal)}`}><Trash2 size={20} /><span>Xóa</span></button>
    <div className="meal-card" style={{ transform: `translateX(${offset}px)`, transition: dragging ? "none" : undefined }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null; setDragging(false); setOffset(0); }}>
      <span className="meal-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL của Supabase, không qua tối ưu ảnh của Next */}
        {meal.photoUrl ? <img src={meal.photoUrl} alt="" draggable={false} /> : <Utensils size={22} aria-hidden="true" />}
      </span>
      <span className="meal-card-body">
        <span className="meal-card-top">
          <Link href={`/meals/${meal.id}`} className="meal-card-title" draggable={false} onClick={event => { if (suppressClick.current) event.preventDefault(); suppressClick.current = false; }}>{mealTitle(meal)}</Link>
          <span className="meal-card-time">{meal.time}</span>
        </span>
        <span className="meal-card-kcal"><Flame size={15} aria-hidden="true" />{formatNumber(meal.totals.kcal)} kcal <span className="muted">· {mealTypeLabels[meal.mealType]}</span></span>
        <MacroLine {...meal.totals} />
      </span>
    </div>
    {error && <p role="alert" className="meal-card-error">{error}</p>}
  </li>;
}
