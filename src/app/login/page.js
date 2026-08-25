"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login } from "./actions";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-brand text-xl font-bold text-white">
            RS
          </div>
          <h1 className="text-lg font-semibold text-neutral-800">
            {t("common.appName")}
          </h1>
        </div>

        <form
          action={formAction}
          className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-bold text-neutral-900">
            {t("login.title")}
          </h2>

          <label className="mb-3 block text-sm font-medium text-neutral-700">
            {t("login.identifier")}
            <input
              type="text"
              name="identifier"
              required
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <label className="mb-4 block text-sm font-medium text-neutral-700">
            {t("login.password")}
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          {state?.error && (
            <p className="mb-4 text-sm font-medium text-brand">
              {t("login.error")}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-brand px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
