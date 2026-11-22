"use client";

import { useSyncExternalStore } from "react";
import { calculateTargets, isProfileDraft, type ProfileDraft } from "@/lib/nutrition/targets";

// Hồ sơ G1 chỉ lưu trong trình duyệt; G2/G5 sẽ thay bằng hồ sơ và mục tiêu theo tài khoản.
const storageKey = "tcgm.nutrition-profile.v1";
const profileEvent = "tcgm-profile-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(profileEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(profileEvent, callback);
  };
}

function readSaved() {
  try { return localStorage.getItem(storageKey); } catch { return null; }
}

function parseSaved(raw: string | null) {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isProfileDraft(value) && calculateTargets(value).plan ? value : null;
  } catch { return null; }
}

/** Hồ sơ đã lưu (hoặc null). Trả về null khi render phía server. */
export function useSavedProfile() {
  return parseSaved(useSyncExternalStore(subscribe, readSaved, () => null));
}

/** Ném lỗi nếu trình duyệt không cho ghi localStorage. */
export function saveProfile(profile: ProfileDraft) {
  localStorage.setItem(storageKey, JSON.stringify(profile));
  window.dispatchEvent(new Event(profileEvent));
}

export function clearProfile() {
  localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event(profileEvent));
}
