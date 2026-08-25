"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { adminUpsertEntry } from "@/app/admin/actions";

export default function AddEntryForm({ workers }) {
  const t = useTranslations();
  const formRef = useRef(null);
  const [state, formAction, isPending] = useActionState(adminUpsertEntry, null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-neutral-900">{t("admin.addEntry")}</h2>
      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-neutral-700">
          {t("common.worker")}
          <select
            name="userId"
            required
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-neutral-700">
          {t("common.date")}
          <input
            type="date"
            name="fecha"
            required
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          {t("common.start")}
          <input
            type="time"
            name="horaInicio"
            defaultValue="08:00"
            required
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          {t("common.end")}
          <input
            type="time"
            name="horaFin"
            defaultValue="17:00"
            required
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          {t("common.break")}
          <input
            type="number"
            name="pausaMinutos"
            min="0"
            step="5"
            defaultValue={30}
            className="mt-1 block w-20 rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          {t("common.note")}
          <input
            type="text"
            name="nota"
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {t("common.save")}
        </button>
      </form>
      {state?.error && (
        <p className="mt-2 text-sm font-medium text-brand">{t("common.genericError")}</p>
      )}
    </div>
  );
}
