"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { adminDeleteEntry, adminUpsertEntry } from "@/app/admin/actions";
import { formatFecha } from "@/lib/hours";

function EntryEditForm({ userId, fecha, entry, onDone }) {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(adminUpsertEntry, null);

  useEffect(() => {
    if (state?.success) onDone?.();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 py-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="fecha" value={fecha} />
      <label className="text-xs text-neutral-500">
        {t("common.start")}
        <input
          type="time"
          name="horaInicio"
          defaultValue={entry?.es_feriado ? "" : entry?.hora_inicio?.slice(0, 5)}
          required
          className="block rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="text-xs text-neutral-500">
        {t("common.end")}
        <input
          type="time"
          name="horaFin"
          defaultValue={entry?.es_feriado ? "" : entry?.hora_fin?.slice(0, 5)}
          required
          className="block rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="text-xs text-neutral-500">
        {t("common.break")}
        <input
          type="number"
          name="pausaMinutos"
          min="0"
          step="5"
          defaultValue={entry?.es_feriado ? 0 : entry?.pausa_minutos ?? 0}
          className="block w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="text-xs text-neutral-500">
        {t("common.note")}
        <input
          type="text"
          name="nota"
          defaultValue={entry?.es_feriado ? "" : entry?.nota ?? ""}
          className="block rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {t("common.save")}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
      >
        {t("common.cancel")}
      </button>
      {state?.error && (
        <span className="w-full text-xs font-medium text-brand">
          {t("dashboard.endBeforeStartError")}
        </span>
      )}
    </form>
  );
}

export default function AdminTable({ entries }) {
  const t = useTranslations();
  const [editingId, setEditingId] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id) {
    if (!window.confirm(t("common.confirmDelete"))) return;
    startTransition(() => adminDeleteEntry(id));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-surface-muted text-left text-neutral-500">
            <th className="px-3 py-2 font-medium">{t("common.worker")}</th>
            <th className="px-3 py-2 font-medium">{t("common.date")}</th>
            <th className="px-3 py-2 font-medium">{t("common.start")}</th>
            <th className="px-3 py-2 font-medium">{t("common.end")}</th>
            <th className="px-3 py-2 font-medium">{t("common.break")}</th>
            <th className="px-3 py-2 font-medium">{t("common.hours")}</th>
            <th className="px-3 py-2 font-medium">{t("common.note")}</th>
            <th className="px-3 py-2 font-medium">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-neutral-100 align-top">
              {editingId === entry.id ? (
                <td colSpan={8} className="px-3">
                  <div className="flex items-center gap-2 pt-2 text-xs font-medium text-neutral-500">
                    {entry.users?.nombre} — {formatFecha(entry.fecha)}
                  </div>
                  <EntryEditForm
                    userId={entry.user_id}
                    fecha={entry.fecha}
                    entry={entry}
                    onDone={() => setEditingId(null)}
                  />
                </td>
              ) : (
                <>
                  <td className="px-3 py-2">{entry.users?.nombre}</td>
                  <td className="px-3 py-2">{formatFecha(entry.fecha)}</td>
                  {entry.es_feriado ? (
                    <td colSpan={3} className="px-3 py-2">
                      <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-semibold text-brand">
                        {t("common.holiday")}
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2">{entry.hora_inicio?.slice(0, 5)}</td>
                      <td className="px-3 py-2">{entry.hora_fin?.slice(0, 5)}</td>
                      <td className="px-3 py-2">{entry.pausa_minutos} min</td>
                    </>
                  )}
                  <td className="px-3 py-2 font-medium">{entry.horas_calculadas}h</td>
                  <td className="px-3 py-2 text-neutral-500">{entry.nota}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingId(entry.id)}
                        className="text-neutral-500 hover:text-brand"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(entry.id)}
                        className="text-neutral-400 hover:text-brand disabled:opacity-50"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
