import { redirect } from "next/navigation";
import { format, startOfMonth } from "date-fns";
import { getCurrentProfile, createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import AdminTable from "@/components/admin/AdminTable";
import AddEntryForm from "@/components/admin/AddEntryForm";
import ExportForm from "@/components/admin/ExportForm";

export default async function AdminPage({ searchParams }) {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");
  if (profile?.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const t = await getTranslations();
  const supabase = await createClient();

  const today = new Date();
  const from = params?.from || format(startOfMonth(today), "yyyy-MM-dd");
  const to = params?.to || format(today, "yyyy-MM-dd");
  const workerId = params?.worker || "";

  const { data: workers = [] } = await supabase
    .from("users")
    .select("id, nombre, activo")
    .eq("rol", "trabajador")
    .order("nombre");

  let query = supabase
    .from("time_entries")
    .select("*, users!time_entries_user_id_fkey(nombre)")
    .gte("fecha", from)
    .lte("fecha", to)
    .order("fecha", { ascending: false });

  if (workerId) query = query.eq("user_id", workerId);

  const { data: entries = [] } = await query;

  const totalsByWorker = {};
  for (const w of workers ?? []) {
    if (workerId && w.id !== workerId) continue;
    totalsByWorker[w.nombre] = 0;
  }
  for (const e of entries ?? []) {
    const name = e.users?.nombre ?? "?";
    totalsByWorker[name] = (totalsByWorker[name] || 0) + Number(e.horas_calculadas);
  }

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">{t("admin.title")}</h1>

        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <label className="text-sm font-medium text-neutral-700">
            {t("admin.filterWorker")}
            <select
              name="worker"
              defaultValue={workerId}
              className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
            >
              <option value="">{t("admin.allWorkers")}</option>
              {(workers ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nombre}
                  {!w.activo ? ` (${t("workers.inactive")})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700">
            {t("admin.filterFrom")}
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            {t("admin.filterTo")}
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="mt-1 block rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
          >
            {t("common.save")}
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          {Object.entries(totalsByWorker).map(([name, total]) => (
            <span
              key={name}
              className="rounded-md bg-surface-muted px-3 py-1.5 text-sm font-medium text-neutral-700"
            >
              {name}: {Math.round(total * 100) / 100}h
            </span>
          ))}
        </div>

        <AdminTable entries={entries ?? []} />

        <AddEntryForm workers={workers ?? []} />

        <ExportForm />
      </main>
    </>
  );
}
