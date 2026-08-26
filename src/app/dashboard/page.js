import { redirect } from "next/navigation";
import { startOfMonth, startOfWeek, subDays, format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import getDb from "@/lib/db";
import { dentroDeVentanaEdicion, hoyISO, EDIT_WINDOW_DAYS } from "@/lib/hours";
import Header from "@/components/Header";
import TimeEntryForm from "@/components/dashboard/TimeEntryForm";
import HistoryTable from "@/components/dashboard/HistoryTable";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.rol === "admin") redirect("/admin");

  const db = getDb();
  const today = new Date();
  const todayISO = hoyISO();
  const fetchFrom = format(
    startOfMonth(subDays(startOfMonth(today), 1)),
    "yyyy-MM-dd"
  );

  const entries = db
    .prepare(
      `select * from time_entries
       where user_id = ? and fecha >= ? and fecha <= ?
       order by fecha desc`
    )
    .all(user.id, fetchFrom, todayISO);

  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");

  const sum = (list) =>
    Math.round(list.reduce((acc, e) => acc + Number(e.horas_calculadas), 0) * 100) / 100;

  const weekTotal = sum(entries.filter((e) => e.fecha >= weekStart));
  const monthTotal = sum(entries.filter((e) => e.fecha >= monthStart));

  const entriesByDate = Object.fromEntries(entries.map((e) => [e.fecha, e]));
  const editableSet = new Set(
    entries.filter((e) => dentroDeVentanaEdicion(e.fecha)).map((e) => e.fecha)
  );

  const minDate = format(subDays(today, EDIT_WINDOW_DAYS), "yyyy-MM-dd");

  return (
    <>
      <Header profile={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
        <TimeEntryForm entriesByDate={entriesByDate} minDate={minDate} maxDate={todayISO} />
        <HistoryTable
          entries={entries}
          weekTotal={weekTotal}
          monthTotal={monthTotal}
          editableSet={editableSet}
        />
      </main>
    </>
  );
}
