"use client";

import { useTranslations } from "next-intl";
import { format, startOfMonth } from "date-fns";

export default function ExportForm() {
  const t = useTranslations();
  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM");

  return (
    <form
      method="get"
      action="/api/export"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <h2 className="w-full text-lg font-bold text-neutral-900">{t("export.title")}</h2>
      <label className="text-sm font-medium text-neutral-700">
        {t("export.monthFrom")}
        <input
          type="month"
          name="from"
          defaultValue={currentMonth}
          required
          className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
        />
      </label>
      <label className="text-sm font-medium text-neutral-700">
        {t("export.monthTo")}
        <input
          type="month"
          name="to"
          defaultValue={currentMonth}
          required
          className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
      >
        {t("export.download")}
      </button>
    </form>
  );
}
