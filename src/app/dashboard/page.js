import { redirect } from "next/navigation";
import { startOfMonth, startOfWeek, subDays, format } from "date-fns";
import { getCurrentProfile, createClient } from "@/lib/supabase/server";
import { dentroDeVentanaEdicion, hoyISO, EDIT_WINDOW_DAYS } from "@/lib/hours";
import Header from "@/components/Header";
import TimeEntryForm from "@/components/dashboard/TimeEntryForm";
import HistoryTable from "@/components/dashboard/HistoryTable";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");
  if (profile?.rol === "admin") redirect("/admin");

  const supabase = await createClient();
  const today = new Date();
  const todayISO = hoyISO();
  const fetchFrom = format(
    startOfMonth(subDays(startOfMonth(today), 1)),
    "yyyy-MM-dd"
  );

  const { data: entries = [] } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("fecha", fetchFrom)
    .lte("fecha", todayISO)
    .order("fecha", { ascending: false });

  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");

  const sum = (list) =>
    Math.round(list.reduce((acc, e) => acc + Number(e.horas_calculadas), 0) * 100) / 100;

  const weekTotal = sum((entries ?? []).filter((e) => e.fecha >= weekStart));
  const monthTotal = sum((entries ?? []).filter((e) => e.fecha >= monthStart));

  const entriesByDate = Object.fromEntries((entries ?? []).map((e) => [e.fecha, e]));
  const editableSet = new Set(
    (entries ?? []).filter((e) => dentroDeVentanaEdicion(e.fecha)).map((e) => e.fecha)
  );

  const minDate = format(subDays(today, EDIT_WINDOW_DAYS), "yyyy-MM-dd");

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
        <TimeEntryForm entriesByDate={entriesByDate} minDate={minDate} maxDate={todayISO} />
        <HistoryTable
          entries={entries ?? []}
          weekTotal={weekTotal}
          monthTotal={monthTotal}
          editableSet={editableSet}
        />
      </main>
    </>
  );
}
