"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changeOwnPassword } from "@/app/profile/actions";

export default function ChangePasswordForm() {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(changeOwnPassword, null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <form action={formAction} className="space-y-3">
        <label className="block text-sm font-medium text-neutral-700">
          {t("profile.newPassword")}
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          {t("profile.confirmPassword")}
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {t("profile.submit")}
        </button>
      </form>

      {state?.error === "tooShort" && (
        <p className="mt-3 text-sm font-medium text-brand">{t("profile.tooShortError")}</p>
      )}
      {state?.error === "mismatch" && (
        <p className="mt-3 text-sm font-medium text-brand">{t("profile.mismatchError")}</p>
      )}
      {state?.error === "db" && (
        <p className="mt-3 text-sm font-medium text-brand">{t("common.genericError")}</p>
      )}
      {state?.success && (
        <p className="mt-3 text-sm font-medium text-green-700">{t("profile.success")}</p>
      )}
    </div>
  );
}
