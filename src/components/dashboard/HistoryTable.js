"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteEntry } from "@/app/dashboard/actions";
import { formatFecha } from "@/lib/hours";

export default function HistoryTable({ entries, weekTotal, monthTotal, editableSet }) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id) {
    if (!window.confirm(t("common.confirmDelete"))) return;
    startTransition(() => deleteEntry(id));
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-neutral-900">{t("dashboard.history")}</h2>
        <div className="flex gap-4 text-sm">
          <span className="rounded-md bg-surface-muted px-3 py-1.5 font-medium text-neutral-700">
            {t("dashboard.weekTotal")}: {weekTotal}h
          </span>
          <span className="rounded-md bg-surface-muted px-3 py-1.5 font-medium text-neutral-700">
            {t("dashboard.monthTotal")}: {monthTotal}h
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-neutral-500">{t("dashboard.noEntries")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-3 font-medium">{t("common.date")}</th>
                <th className="py-2 pr-3 font-medium">{t("common.start")}</th>
                <th className="py-2 pr-3 font-medium">{t("common.end")}</th>
                <th className="py-2 pr-3 font-medium">{t("common.break")}</th>
                <th className="py-2 pr-3 font-medium">{t("common.hours")}</th>
                <th className="py-2 pr-3 font-medium">{t("common.note")}</th>
                <th className="py-2 pr-3 font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-3">{formatFecha(entry.fecha)}</td>
                  {entry.es_feriado ? (
                    <td colSpan={3} className="py-2 pr-3">
                      <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-semibold text-brand">
                        {t("common.holiday")}
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="py-2 pr-3">{entry.hora_inicio?.slice(0, 5)}</td>
                      <td className="py-2 pr-3">{entry.hora_fin?.slice(0, 5)}</td>
                      <td className="py-2 pr-3">{entry.pausa_minutos} min</td>
                    </>
                  )}
                  <td className="py-2 pr-3 font-medium">{entry.horas_calculadas}h</td>
                  <td className="py-2 pr-3 text-neutral-500">{entry.nota}</td>
                  <td className="py-2 pr-3">
                    {editableSet.has(entry.fecha) && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(entry.id)}
                        className="text-neutral-400 hover:text-brand disabled:opacity-50"
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
