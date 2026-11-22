export const activities = {
  low: { label: "Ít vận động", detail: "Chủ yếu ngồi, hiếm khi tập", factor: 1.2 },
  light: { label: "Vận động nhẹ", detail: "Hay đi bộ hoặc tập nhẹ 1–3 buổi/tuần", factor: 1.375 },
  moderate: { label: "Vận động vừa", detail: "Tập 3–5 buổi/tuần hoặc công việc hay di chuyển", factor: 1.55 },
  high: { label: "Vận động nhiều", detail: "Tập nặng thường xuyên hoặc làm việc thể lực", factor: 1.725 },
};

export const goals = {
  loss: { label: "Giảm cân", adjustment: -1750, protein: 1.6 },
  gain: { label: "Tăng cân", adjustment: 1400, protein: 1.6 },
  recomposition: { label: "Tăng cơ, giảm mỡ", adjustment: -700, protein: 1.8 },
  maintain: { label: "Duy trì", adjustment: 0, protein: 1.4 },
};

export type ProfileDraft = {
  weight: string;
  height: string;
  bodyFat: string;
  age: string;
  sex: string;
  activity: string;
  goal: string;
  weekly: string;
  favorites: string;
  frequent: string;
  allergies: string;
};

export const emptyProfile: ProfileDraft = {
  weight: "", height: "", bodyFat: "", age: "", sex: "", activity: "",
  goal: "", weekly: "", favorites: "", frequent: "", allergies: "",
};

export function isProfileDraft(value: unknown): value is ProfileDraft {
  if (typeof value !== "object" || value === null) return false;
  return Object.keys(emptyProfile).every(key => typeof Reflect.get(value, key) === "string");
}

function decimal(input: string) {
  const value = input.trim();
  return /^\d+(?:[.,]\d+)?$/.test(value) ? Number(value.replace(",", ".")) : NaN;
}

function inRange(value: number, low: number, high: number) {
  return Number.isFinite(value) && value >= low && value <= high;
}

export function readBody(draft: ProfileDraft) {
  const weight = decimal(draft.weight);
  const height = decimal(draft.height);
  const age = decimal(draft.age);
  const fat = draft.bodyFat.trim() ? decimal(draft.bodyFat) : null;
  if (!inRange(weight, 30, 350)) return { error: "Nhập cân nặng từ 30 đến 350 kg." } as const;
  if (!inRange(height, 120, 230)) return { error: "Nhập chiều cao từ 120 đến 230 cm." } as const;
  if (!Number.isInteger(age) || !inRange(age, 19, 78)) return { error: "Công thức này áp dụng trong app cho độ tuổi 19–78." } as const;
  if (fat !== null && !inRange(fat, 3, 75)) return { error: "Tỉ lệ mỡ phải từ 3% đến 75%, hoặc để trống nếu chưa biết." } as const;
  if (draft.sex !== "male" && draft.sex !== "female") return { error: "Chọn giới tính dùng cho công thức." } as const;
  return { weight, height, age, fat, sex: draft.sex } as const;
}

export function calculateTargets(draft: ProfileDraft) {
  const body = readBody(draft);
  if ("error" in body) return { error: body.error };
  if (!Object.hasOwn(activities, draft.activity) || !Object.hasOwn(goals, draft.goal)) {
    return { error: "Chọn mức vận động và mục tiêu của bạn." };
  }
  const goal = goals[draft.goal as keyof typeof goals];
  const activity = activities[draft.activity as keyof typeof activities];
  const weekly = draft.goal === "maintain" ? 0 : decimal(draft.weekly);
  const limit = draft.goal === "loss" ? 3500 : draft.goal === "gain" ? 2100 : 1750;
  if (!Number.isInteger(weekly) || weekly < 0 || weekly > limit || (weekly === 0 && (draft.goal === "loss" || draft.goal === "gain"))) {
    return { error: `Nhập mức điều chỉnh nguyên từ ${draft.goal === "recomposition" ? 0 : 1} đến ${limit} kcal/tuần.` };
  }
  const bmi = body.weight / (body.height / 100) ** 2;
  if (bmi < 18.5 && (draft.goal === "loss" || (draft.goal === "recomposition" && weekly > 0))) {
    return { error: "Công cụ không tính thâm hụt khi BMI dưới 18,5. Bạn có thể chọn duy trì để xem mức ước tính." };
  }
  const resting = Math.round(10 * body.weight + 6.25 * body.height - 5 * body.age + (body.sex === "male" ? 5 : -161));
  const maintenance = Math.round(resting * activity.factor);
  const signedWeekly = draft.goal === "gain" ? weekly : -weekly;
  const kcal = Math.round(maintenance + signedWeekly / 7);
  if (kcal < Math.max(1200, resting) || (signedWeekly < 0 && -signedWeekly / 7 > maintenance * 0.2)) {
    return { error: "Mức nạp ước tính quá thấp theo giới hạn của công cụ. Giảm mức thâm hụt mỗi tuần hoặc chọn duy trì." };
  }
  const protein = Math.round(Math.min(body.weight * goal.protein, kcal * 0.35 / 4));
  const fat = Math.round(kcal * 0.25 / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  return {
    plan: { resting, maintenance, kcal, protein, fat, carbs, signedWeekly: signedWeekly || 0,
      dailyChange: kcal - maintenance, leanMass: body.fat === null ? null : body.weight * (1 - body.fat / 100) },
  };
}

export function splitFoods(input: string) {
  return input.split(/[,;\n]/).map(value => value.trim()).filter(Boolean);
}

export function familiarFoods(draft: ProfileDraft) {
  const allergyEntries = splitFoods(draft.allergies);
  // Free-text allergy descriptions cannot reliably screen recipes or ingredients.
  if (allergyEntries.length) return [];
  return Array.from(new Set([...splitFoods(draft.frequent), ...splitFoods(draft.favorites)])).slice(0, 6);
}
