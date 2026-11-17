"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Username</label>
        <input name="username" className="input" autoFocus required autoComplete="username" />
      </div>
      <div>
        <label className="label">Password</label>
        <input name="password" type="password" className="input" required autoComplete="current-password" />
      </div>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Masuk..." : "Masuk"}
      </button>
    </form>
  );
}
