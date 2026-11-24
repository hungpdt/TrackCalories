"use client";

import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Thứ Hai của tuần chứa ngày. */
function mondayOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
}

/**
 * Thanh ngày theo tuần (T2–CN). Kéo sang phải xem tuần trước, sang trái xem tuần sau (không quá tuần hiện tại).
 * Nút mũi tên cho bàn phím/chuột. Chạm vào ngày để xem ngày đó.
 */
export function WeekStrip({ date, today, loggedDays }: { date: string; today: string; loggedDays: string[] }) {
  const [week, setWeek] = useState(() => mondayOf(date));
  const [shownFor, setShownFor] = useState(date);
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const drag = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const suppressClick = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const currentWeek = mondayOf(today);
  const logged = new Set(loggedDays);

  // Đổi ngày đang xem (từ link khác) thì về tuần chứa ngày đó.
  if (shownFor !== date) { setShownFor(date); setWeek(mondayOf(date)); }

  const canNext = week < currentWeek;

  function go(direction: -1 | 1) {
    if (direction === 1 && !canNext) { setDx(0); return; }
    const width = trackRef.current?.offsetWidth ?? 320;
    setAnimating(true);
    setDx(-direction * width);
    window.setTimeout(() => { setAnimating(false); setDx(0); setWeek(current => shiftDate(current, direction * 7)); }, 220);
  }

  function onPointerDown(event: PointerEvent) {
    if (animating) return;
    drag.current = { x: event.clientX, y: event.clientY, horizontal: null };
  }
  function onPointerMove(event: PointerEvent) {
    const state = drag.current;
    if (!state) return;
    const moveX = event.clientX - state.x;
    const moveY = event.clientY - state.y;
    if (state.horizontal === null && (Math.abs(moveX) > 6 || Math.abs(moveY) > 6)) state.horizontal = Math.abs(moveX) > Math.abs(moveY);
    if (!state.horizontal) return;
    suppressClick.current = true;
    // Tuần hiện tại là tuần mới nhất: kéo sang trái chỉ nhích nhẹ.
    setDx(moveX < 0 && !canNext ? moveX / 4 : moveX);
  }
  function onPointerUp() {
    const state = drag.current;
    drag.current = null;
    if (!state?.horizontal) return;
    if (dx > 50) go(-1);
    else if (dx < -50) go(1);
    else { setAnimating(true); setDx(0); window.setTimeout(() => setAnimating(false), 200); }
  }

  const renderWeek = (monday: string) => Array.from({ length: 7 }, (_, index) => {
    const day = shiftDate(monday, index);
    const future = day > today;
    const content = <><span className="week-day">{day === today ? "Nay" : weekdays[new Date(`${day}T00:00:00Z`).getUTCDay()]}</span>
      <span className={`week-date${logged.has(day) ? " logged" : ""}`}>{Number(day.slice(8))}</span></>;
    return future ? <span key={day} className="week-cell future" aria-disabled="true">{content}</span>
      : <Link key={day} href={`/?date=${day}`} className="week-cell" draggable={false} aria-current={day === date ? "date" : undefined} aria-label={`Ngày ${day.split("-").reverse().join("/")}`}
        onClick={event => { if (suppressClick.current) event.preventDefault(); suppressClick.current = false; }}>{content}</Link>;
  });

  const month = new Date(`${week}T00:00:00Z`).getUTCMonth() + 1;
  return <nav className="week-strip" aria-label="Chọn ngày">
    <div className="week-head">
      <button type="button" className="week-arrow" aria-label="Tuần trước" onClick={() => go(-1)}><ChevronLeft size={18} /></button>
      <span>Tháng {month}{week === currentWeek ? " · Tuần này" : ""}</span>
      <button type="button" className="week-arrow" aria-label="Tuần sau" disabled={!canNext} onClick={() => go(1)}><ChevronRight size={18} /></button>
    </div>
    <div className="week-viewport" ref={trackRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={() => { drag.current = null; setDx(0); }}>
      <div className="week-track" style={{ transform: `translateX(calc(-100% + ${dx}px))`, transition: animating ? "transform .22s ease" : "none" }}>
        <div className="week-page" aria-hidden="true" inert>{renderWeek(shiftDate(week, -7))}</div>
        <div className="week-page">{renderWeek(week)}</div>
        <div className="week-page" aria-hidden="true" inert>{renderWeek(shiftDate(week, 7))}</div>
      </div>
    </div>
  </nav>;
}
