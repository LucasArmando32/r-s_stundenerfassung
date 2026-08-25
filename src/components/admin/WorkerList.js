"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setWorkerActive } from "@/app/admin/trabajadores/actions";

export default function WorkerList({ workers }) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState(new Set());

  function toggle(worker) {
    const confirmMsg = worker.activo
      ? t("workers.confirmDeactivate")
      : t("workers.confirmActivate");
    if (!window.confirm(confirmMsg)) return;
    startTransition(() => setWorkerActive(worker.id, !worker.activo));
  }

  function toggleReveal(id) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-surface-muted text-left text-neutral-500">
            <th className="px-3 py-2 font-medium">{t("common.worker")}</th>
            <th className="px-3 py-2 font-medium">{t("workers.username")}</th>
            <th className="px-3 py-2 font-medium">{t("workers.password")}</th>
            <th className="px-3 py-2 font-medium">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id} className="border-b border-neutral-100">
              <td className="px-3 py-2">{w.nombre}</td>
              <td className="px-3 py-2 font-mono text-xs">{w.email?.split("@")[0]}</td>
              <td className="px-3 py-2 font-mono text-xs">
                {w.password ? (
                  <button
                    type="button"
                    onClick={() => toggleReveal(w.id)}
                    className="text-neutral-500 hover:text-brand"
                  >
                    {revealed.has(w.id) ? w.password : "••••••••"}
                  </button>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    w.activo ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {w.activo ? t("workers.active") : t("workers.inactive")}
                </span>
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggle(w)}
                  className="text-neutral-500 hover:text-brand disabled:opacity-50"
                >
                  {w.activo ? t("workers.deactivate") : t("workers.activate")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
