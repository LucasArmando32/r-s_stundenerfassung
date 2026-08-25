"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { saveEntry } from "@/app/dashboard/actions";

const ERROR_KEYS = {
  future: "dashboard.futureDateError",
  pastLimit: "dashboard.pastLimitError",
  invalidRange: "dashboard.endBeforeStartError",
};

export default function TimeEntryForm({ entriesByDate, minDate, maxDate }) {
  const t = useTranslations();
  const [fecha, setFecha] = useState(maxDate);
  const [overriding, setOverriding] = useState(false);
  const [state, formAction, isPending] = useActionState(saveEntry, null);

  const entry = entriesByDate[fecha];
  const isHoliday = entry?.es_feriado;
  const showForm = !isHoliday || overriding;

  const defaults = useMemo(
    () => ({
      horaInicio: entry && !entry.es_feriado ? entry.hora_inicio?.slice(0, 5) : "08:00",
      horaFin: entry && !entry.es_feriado ? entry.hora_fin?.slice(0, 5) : "17:00",
      pausaMinutos: entry && !entry.es_feriado ? entry.pausa_minutos : 30,
      nota: entry && !entry.es_feriado ? entry.nota ?? "" : "",
    }),
    [entry]
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-neutral-900">
        {t("dashboard.newEntry")}
      </h2>

      <label className="mb-4 block text-sm font-medium text-neutral-700">
        {t("common.date")}
        <input
          type="date"
          value={fecha}
          min={minDate}
          max={maxDate}
          onChange={(e) => {
            setFecha(e.target.value);
            setOverriding(false);
          }}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>

      {isHoliday && !overriding ? (
        <div className="rounded-md bg-surface-muted p-4 text-sm">
          <p className="mb-3 font-medium text-neutral-700">
            {t("dashboard.holidayBadge")}
          </p>
          <button
            type="button"
            onClick={() => setOverriding(true)}
            className="text-brand underline underline-offset-2"
          >
            {t("dashboard.overrideHoliday")}
          </button>
        </div>
      ) : null}

      {showForm && (
        <form action={formAction} key={fecha + overriding} className="space-y-4">
          <input type="hidden" name="fecha" value={fecha} />

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-neutral-700">
              {t("common.start")}
              <input
                type="time"
                name="horaInicio"
                defaultValue={defaults.horaInicio}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              {t("common.end")}
              <input
                type="time"
                name="horaFin"
                defaultValue={defaults.horaFin}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-neutral-700">
            {t("common.break")}
            <input
              type="number"
              name="pausaMinutos"
              min="0"
              step="5"
              defaultValue={defaults.pausaMinutos}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <label className="block text-sm font-medium text-neutral-700">
            {t("common.note")}
            <input
              type="text"
              name="nota"
              defaultValue={defaults.nota}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          {state?.error && (
            <p className="text-sm font-medium text-brand">
              {t(ERROR_KEYS[state.error] ?? "dashboard.pastLimitError")}
            </p>
          )}
          {state?.success && (
            <p className="text-sm font-medium text-green-700">
              {t("dashboard.entrySaved")}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-brand px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {t("common.save")}
          </button>
        </form>
      )}
    </div>
  );
}
