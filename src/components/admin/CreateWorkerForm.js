"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createWorker } from "@/app/admin/trabajadores/actions";

export default function CreateWorkerForm() {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(createWorker, null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-neutral-900">{t("workers.createNew")}</h2>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-neutral-700">
          {t("workers.firstName")}
          <input
            type="text"
            name="nombre"
            required
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          {t("workers.lastName")}
          <input
            type="text"
            name="apellido"
            required
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {t("workers.create")}
        </button>
      </form>

      {state?.error && (
        <p className="mt-3 text-sm font-medium text-brand">{t("common.genericError")}</p>
      )}

      {state?.success && (
        <div className="mt-4 rounded-md border border-brand/30 bg-surface-muted p-4">
          <p className="mb-2 text-sm font-semibold text-neutral-800">
            {t("workers.credentialsWarning")}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="font-medium text-neutral-500">{t("common.worker")}</dt>
            <dd>{state.nombre}</dd>
            <dt className="font-medium text-neutral-500">{t("workers.username")}</dt>
            <dd className="font-mono">{state.username}</dd>
            <dt className="font-medium text-neutral-500">{t("workers.generatedPassword")}</dt>
            <dd className="font-mono font-bold">{state.password}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
