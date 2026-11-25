"use client";

import { useActionState, useState } from "react";
import { Sprout } from "lucide-react";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm({ signupEnabled = true }: { signupEnabled?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return <main className="auth-page" id="main-content">
    <section className="card auth-card" aria-labelledby="auth-title">
      <p className="auth-brand"><Sprout size={24} aria-hidden="true" /> tcgm</p>
      <h1 id="auth-title">{mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}</h1>
      <p className="muted">Dữ liệu bữa ăn, mục tiêu và cân nặng được lưu riêng theo tài khoản của bạn.</p>
      {signupEnabled && <div className="segmented auth-switch" role="group" aria-label="Chọn thao tác">
        <button type="button" aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>Đăng nhập</button>
        <button type="button" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>Tạo tài khoản</button>
      </div>}
      <form action={mode === "signin" ? signInAction : signUpAction} className="auth-form" key={mode}>
        <label className="field">Email
          <input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state.email} />
        </label>
        <label className="field">Mật khẩu
          <input name="password" type="password" required minLength={8} maxLength={72}
            autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          {mode === "signup" && <span className="field-hint">Ít nhất 8 ký tự.</span>}
        </label>
        {state.error && <p role="alert" className="error-message">{state.error}</p>}
        <button className="button full-width" type="submit" disabled={pending}>
          {pending ? "Đang xử lý…" : mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>
    </section>
  </main>;
}
