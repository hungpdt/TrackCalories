"use client";
import { useAiJobs } from "@/features/quick-log/ai-jobs";

import { useState, useSyncExternalStore, useTransition, type ComponentProps, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/features/dashboard/dashboard";
import { saveProfileGoal } from "@/features/goals/actions";
import { formatNumber, type Nutrients } from "@/lib/format";
import {
  activities, calculateTargets, emptyProfile, familiarFoods, goals,
  readBody, splitFoods, type ProfileDraft,
} from "@/lib/nutrition/targets";

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

const steps = ["Số đo", "Vận động và mục tiêu", "Sở thích và dị ứng"];

function Field({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <label className="field">
    <span>{title}</span>
    {hint && <span className="field-hint">{hint}</span>}
    {children}
  </label>;
}

function Results({ draft, onEdit, onSave, saving = false }: {
  draft: ProfileDraft;
  onEdit: () => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  const { plan } = calculateTargets(draft);
  if (!plan) return null;
  const foodIdeas = familiarFoods(draft);
  const hasAllergy = splitFoods(draft.allergies).length > 0;
  const changeLabel = plan.signedWeekly < 0 ? "Thâm hụt" : plan.signedWeekly > 0 ? "Thặng dư" : "Chênh lệch";
  const macros = [
    ["Protein", plan.protein, "protein"], ["Carb", plan.carbs, "carbs"], ["Chất béo", plan.fat, "fat"],
  ] as const;
  return <div className="setup-results">
    <div className="target-hero">
      <p>Mức nạp ước tính · {goals[draft.goal as keyof typeof goals].label}</p>
      <strong data-testid="intake">{formatNumber(plan.kcal)}</strong> <span>kcal/ngày</span>
    </div>
    <dl className="target-metrics">
      <div><dt>Duy trì cân nặng</dt><dd>{formatNumber(plan.maintenance)} kcal/ngày</dd></div>
      <div><dt>{changeLabel} mỗi ngày</dt><dd>{formatNumber(Math.abs(plan.dailyChange))} kcal/ngày <small>(xấp xỉ)</small></dd></div>
      <div><dt>{changeLabel} mỗi tuần</dt><dd>{formatNumber(Math.abs(plan.signedWeekly))} kcal/tuần</dd></div>
    </dl>
    {plan.lowIntake && <p className="help-note" role="note">Mức ước tính dưới 1.200 kcal/ngày. Đây chỉ là điểm bắt đầu; nên hỏi ý kiến bác sĩ hoặc chuyên gia dinh dưỡng trước khi áp dụng.</p>}
    <h2>Macro mỗi ngày</h2>
    <div className="target-macros">
      {macros.map(([label, value, kind]) => <div className={kind} key={kind}>
        <span><i className="macro-dot" />{label}</span><strong>{formatNumber(value)} <small>g</small></strong>
      </div>)}
    </div>
    <details>
      <summary>Cách tính và giới hạn</summary>
      <p>Mifflin–St Jeor ước tính mức nghỉ {formatNumber(plan.resting)} kcal/ngày từ cân nặng, chiều cao, tuổi và giới tính của công thức. App nhân mức nghỉ với hệ số vận động, sau đó cộng hoặc trừ mức điều chỉnh tuần chia cho 7.</p>
      <p>Protein dựa trên cân nặng và mục tiêu, giới hạn 35% năng lượng. Chất béo chiếm khoảng 25%, carb dùng phần năng lượng còn lại. Số gram được làm tròn. {plan.leanMass !== null && <>Khối lượng không mỡ ước tính {formatNumber(plan.leanMass)} kg từ tỉ lệ mỡ bạn nhập. </>}Tỉ lệ mỡ chỉ dùng để hiển thị thông tin cơ thể.</p>
      <p>Mức nạp là điểm bắt đầu ước tính cho người lớn khỏe mạnh từ 19–78 tuổi. Công cụ không phù hợp khi mang thai, cho con bú hoặc cần chế độ ăn theo chỉ định.</p>
      <a className="text-link" href="https://pubmed.ncbi.nlm.nih.gov/2305711/">Nghiên cứu Mifflin–St Jeor</a>
    </details>
    <section className="setup-foods" aria-labelledby="food-ideas">
      <h2 id="food-ideas">Gợi ý từ món bạn hay ăn</h2>
      {hasAllergy ? <p>Đã tạm ẩn gợi ý vì bạn khai báo dị ứng. Hãy kiểm tra thành phần và nguy cơ nhiễm chéo trước khi chọn món.</p>
        : foodIdeas.length ? <><p>Ưu tiên món bạn ăn thường xuyên, rồi đến món yêu thích. Đây là gợi ý để chọn món khi ghi bữa.</p><ul>{foodIdeas.map(name => <li key={name}>{name}</li>)}</ul></>
        : <p>Thêm vài món quen để nhận gợi ý phù hợp với sở thích.</p>}
    </section>
    <div className="setup-actions">
      <button className="button secondary" onClick={onEdit}>Chỉnh thông tin</button>
      {onSave ? <button className="button" onClick={onSave} disabled={saving}>{saving ? "Đang lưu…" : "Lưu mục tiêu"}</button>
        : <Link className="button" href="/add-meal">Ghi bữa ăn</Link>}
    </div>
  </div>;
}

function SetupForm({ initial, onCancel, onDone }: {
  initial: ProfileDraft;
  onCancel?: () => void;
  onDone: (profile: ProfileDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  function update(key: keyof ProfileDraft, value: string) {
    setDraft(current => ({ ...current, [key]: value }));
    setError("");
  }

  function move(next: number) {
    setError("");
    setStep(next);
    requestAnimationFrame(() => document.getElementById("setup-step")?.focus());
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = step === 0 ? readBody(draft) : calculateTargets(draft);
    if (result.error) { setError(result.error); return; }
    if (step < 2) move(step + 1);
    else onDone(draft);
  }

  const numberField = (key: keyof ProfileDraft, title: string, placeholder: string, required = true) =>
    <Field title={title}><input inputMode="decimal" required={required} maxLength={8} placeholder={placeholder}
      value={draft[key]} onChange={event => update(key, event.target.value)} /></Field>;

  return <section className="card setup-card">
    <ol className="setup-steps" aria-label="Tiến độ thiết lập">
      {steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}>
        <span>{index + 1}</span>{label}
      </li>)}
    </ol>
    <form onSubmit={submit}>
      <h2 id="setup-step" tabIndex={-1}>{steps[step]}</h2>
      {step === 0 && <>
        <p className="muted">Các số đo dùng để ước tính mức năng lượng bạn tiêu hao mỗi ngày.</p>
        <div className="setup-fields">
          {numberField("weight", "Cân nặng (kg)", "Ví dụ 75,5")}
          {numberField("height", "Chiều cao (cm)", "Ví dụ 175")}
          {numberField("age", "Tuổi", "Ví dụ 30")}
          <Field title="Giới tính dùng cho công thức">
            <select required value={draft.sex} onChange={event => update("sex", event.target.value)}>
              <option value="">Chọn giới tính</option><option value="male">Nam</option><option value="female">Nữ</option>
            </select>
          </Field>
          {numberField("bodyFat", "Tỉ lệ mỡ (%) · tùy chọn", "Để trống nếu chưa biết", false)}
        </div>
        <p className="small muted">Dành cho người lớn khỏe mạnh 19–78 tuổi. Không dùng khi mang thai, cho con bú hoặc cần chế độ ăn theo chỉ định.</p>
      </>}
      {step === 1 && <>
        <Field title="Mức vận động" hint="Tính cả công việc, đi lại và tập luyện trong một tuần điển hình.">
          <select required value={draft.activity} onChange={event => update("activity", event.target.value)}>
            <option value="">Chọn mức vận động</option>
            {Object.entries(activities).map(([key, value]) => <option value={key} key={key}>{value.label} · {value.detail}</option>)}
          </select>
        </Field>
        <Field title="Mục tiêu">
          <select required value={draft.goal} onChange={event => {
            const key = event.target.value as keyof typeof goals;
            setDraft(current => ({ ...current, goal: key, weekly: key ? String(Math.abs(goals[key].adjustment)) : "" }));
            setError("");
          }}>
            <option value="">Chọn mục tiêu</option>
            {Object.entries(goals).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}
          </select>
        </Field>
        {draft.goal && draft.goal !== "maintain" && <Field
          title={draft.goal === "gain" ? "Calorie tăng thêm mỗi tuần (kcal)" : "Calorie cắt giảm mỗi tuần (kcal)"}
          hint="App chia số này cho 7 để tính mức điều chỉnh mỗi ngày. Bạn có thể sửa giá trị gợi ý.">
          <input required inputMode="numeric" maxLength={5} value={draft.weekly} onChange={event => update("weekly", event.target.value)} />
        </Field>}
      </>}
      {step === 2 && <>
        <p className="muted">Các mục bên dưới đều tùy chọn. Tách từng món hoặc thành phần bằng dấu phẩy hoặc xuống dòng.</p>
        <Field title="Món bạn hay ăn"><textarea rows={2} maxLength={300} placeholder="Cơm gà, bún cá…" value={draft.frequent} onChange={event => update("frequent", event.target.value)} /></Field>
        <Field title="Món bạn thích"><textarea rows={2} maxLength={300} placeholder="Phở bò, trứng luộc…" value={draft.favorites} onChange={event => update("favorites", event.target.value)} /></Field>
        <Field title="Món hoặc thành phần gây dị ứng" hint="App tạm ẩn gợi ý món khi có dị ứng vì chưa xác minh được thành phần.">
          <textarea rows={2} maxLength={300} placeholder="Ví dụ tôm, đậu phộng…" value={draft.allergies} onChange={event => update("allergies", event.target.value)} />
        </Field>
      </>}
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="setup-actions">
        {step > 0 ? <button type="button" className="button secondary" onClick={() => move(step - 1)}>Quay lại</button>
          : onCancel && <button type="button" className="button secondary" onClick={onCancel}>Hủy chỉnh sửa</button>}
        <button type="submit" className="button">{step === 2 ? "Tính calories và macro" : "Tiếp tục"}</button>
      </div>
    </form>
  </section>;
}

type DashboardData = Omit<ComponentProps<typeof Dashboard>, "targets"> & { targets: Nutrients | null };

export function FirstRun({ saved, targets, dashboard }: { saved: ProfileDraft | null; targets: Nutrients | null; dashboard: DashboardData }) {
  const pendingJobs = useAiJobs().jobs.filter(job => job.date === dashboard.date).length;
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<ProfileDraft | null>(null);
  const [initial, setInitial] = useState<ProfileDraft | null>(null);
  const [message, setMessage] = useState("");
  const profile = preview ?? (!editing ? saved : null);
  // Đã có mục tiêu trong database và không đang chỉnh: Tổng quan hiện Dashboard ngày trước, mục tiêu ở dưới.
  const showDashboard = saved && targets && !editing && !preview;
  // Đến từ link /#muc-tieu (Cài đặt → Chỉnh hồ sơ): mở sẵn thẻ mục tiêu.
  const hashOpen = useSyncExternalStore(subscribeHash, () => window.location.hash === "#muc-tieu", () => false);

  function edit(value: ProfileDraft) {
    setInitial(value);
    setEditing(true);
    setMessage("");
    setPreview(null);
    window.scrollTo({ top: 0 });
  }

  function save() {
    if (!preview || saving) return;
    const draft = preview;
    startSaving(async () => {
      const result = await saveProfileGoal(draft);
      if (!result.ok) { setMessage(result.error); return; }
      setPreview(null);
      setEditing(false);
      setMessage("Đã lưu mục tiêu vào tài khoản.");
      router.refresh();
      window.scrollTo({ top: 0 });
    });
  }

  const goalCard = profile ? <section className="card setup-card" id="muc-tieu">
    <Results draft={profile} onEdit={() => edit(profile)} onSave={preview ? save : undefined} saving={saving} />
    <p role="status" className="feedback">{message}</p>
  </section> : <SetupForm initial={initial ?? saved ?? emptyProfile}
    onCancel={saved ? () => { setEditing(false); setInitial(null); } : undefined}
    onDone={value => { setPreview(value); setMessage(""); }} />;
  const accountNote = <p className="setup-local muted">Hồ sơ và mục tiêu được lưu vào tài khoản của bạn khi bấm lưu. Mục tiêu mới có hiệu lực từ hôm nay, không đổi mục tiêu của các ngày trước.</p>;

  // Phương án A: mục tiêu thu gọn thành một dòng dưới Dashboard; mở bằng "Xem mục tiêu" hoặc link #muc-tieu.
  if (showDashboard) return <>
    <Dashboard {...dashboard} />
    <section className="setup-page home-goals" aria-label="Mục tiêu dinh dưỡng của bạn">
      <details className="home-goals-toggle" id="muc-tieu-toggle" open={hashOpen || undefined}>
        <summary>Mục tiêu dinh dưỡng của bạn · {formatNumber(targets.kcal)} kcal/ngày</summary>
        {goalCard}
        {accountNote}
      </details>
    </section>
  </>;

  // Chưa có mục tiêu nhưng đã ghi bữa (ví dụ ghi trước khi thiết lập): vẫn hiện các bữa, form thiết lập ở dưới.
  // Chưa có mục tiêu nhưng đã có bữa ăn, đang xem ngày khác, hoặc có bản ghi AI đang chạy/chờ kiểm tra: hiện Dashboard trước.
  const mealsFirst = !saved && !preview && (dashboard.meals.length > 0 || dashboard.date !== dashboard.today || pendingJobs > 0);
  return <>{mealsFirst && <Dashboard {...dashboard} />}<div className="setup-page">
    <header className="setup-heading">
      <h1>{profile ? "Mục tiêu dinh dưỡng của bạn" : "Thiết lập mục tiêu của bạn"}</h1>
      <p className="muted">{profile ? "Xem mức nạp ước tính và lượng protein, carb, chất béo mỗi ngày." : "Nhập số đo, mức vận động và thói quen ăn uống để tính mức nạp mỗi ngày."}</p>
    </header>
    {goalCard}
    {accountNote}
  </div></>;
}
