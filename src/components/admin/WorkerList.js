"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  setWorkerActive,
  linkTagesplanObrero,
  resetWorkerPassword,
  setWorkerPassword,
} from "@/app/admin/trabajadores/actions";

export default function WorkerList({ workers, tagesplanObreros }) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [draftPassword, setDraftPassword] = useState("");

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

  function handleLink(userId, obreroId) {
    startTransition(() => linkTagesplanObrero(userId, obreroId));
  }

  function handleResetPassword(worker) {
    if (!window.confirm(t("workers.confirmResetPassword"))) return;
    startTransition(async () => {
      const result = await resetWorkerPassword(worker.id);
      if (result?.success) {
        setRevealed((prev) => new Set(prev).add(worker.id));
      }
    });
  }

  function startEditing(worker) {
    setEditingId(worker.id);
    setDraftPassword(worker.password ?? "");
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftPassword("");
  }

  function saveEditing(worker) {
    const password = draftPassword;
    startTransition(async () => {
      const result = await setWorkerPassword(worker.id, password);
      if (result?.success) {
        setRevealed((prev) => new Set(prev).add(worker.id));
        setEditingId(null);
        setDraftPassword("");
      } else if (result?.error === "tooShort") {
        window.alert(t("workers.passwordTooShort"));
      }
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
            <th className="px-3 py-2 font-medium">{t("workers.tagesplanLink")}</th>
            <th className="px-3 py-2 font-medium">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id} className="border-b border-neutral-100">
              <td className="px-3 py-2">{w.nombre}</td>
              <td className="px-3 py-2 font-mono text-xs">{w.email?.split("@")[0]}</td>
              <td className="px-3 py-2 font-mono text-xs">
                {editingId === w.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={draftPassword}
                      onChange={(e) => setDraftPassword(e.target.value)}
                      autoFocus
                      className="w-28 rounded border border-neutral-300 px-2 py-1 font-mono text-xs"
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => saveEditing(w)}
                      className="text-brand hover:text-brand-dark disabled:opacity-50"
                    >
                      {t("common.save")}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={cancelEditing}
                      className="text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {w.password ? (
                      <button
                        type="button"
                        onClick={() => toggleReveal(w.id)}
                        className="text-neutral-500 hover:text-brand"
                      >
                        {revealed.has(w.id) ? w.password : "••••••••"}
                      </button>
                    ) : (
                      <span>—</span>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditing(w)}
                      className="text-neutral-400 hover:text-brand"
                      title={t("workers.editPassword")}
                    >
                      ✎
                    </button>
                  </div>
                )}
              </td>
              <td className="px-3 py-2">
                <select
                  defaultValue={w.tagesplan_obrero_id ?? ""}
                  disabled={isPending}
                  onChange={(e) => handleLink(w.id, e.target.value)}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                >
                  <option value="">{t("workers.tagesplanNotLinked")}</option>
                  {tagesplanObreros.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
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
              <td className="px-3 py-2 space-x-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggle(w)}
                  className="text-neutral-500 hover:text-brand disabled:opacity-50"
                >
                  {w.activo ? t("workers.deactivate") : t("workers.activate")}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleResetPassword(w)}
                  className="text-neutral-500 hover:text-brand disabled:opacity-50"
                >
                  {t("workers.resetPassword")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
