import { redirect } from "next/navigation";
import { getCurrentProfile, createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import CreateWorkerForm from "@/components/admin/CreateWorkerForm";
import WorkerList from "@/components/admin/WorkerList";
import { fetchTagesplanObreros } from "./actions";

export default async function TrabajadoresPage() {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");
  if (profile?.rol !== "admin") redirect("/dashboard");

  const t = await getTranslations();
  const supabase = await createClient();

  const { data: workers = [] } = await supabase
    .from("users")
    .select("id, nombre, email, activo, tagesplan_obrero_id")
    .eq("rol", "trabajador")
    .order("nombre");

  const { data: credentials = [] } = await supabase
    .from("worker_credentials")
    .select("user_id, password_plano");

  const passwordByUserId = Object.fromEntries(
    (credentials ?? []).map((c) => [c.user_id, c.password_plano])
  );
  const workersWithPassword = (workers ?? []).map((w) => ({
    ...w,
    password: passwordByUserId[w.id] ?? null,
  }));

  const tagesplanObreros = await fetchTagesplanObreros();

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">{t("workers.title")}</h1>
        <CreateWorkerForm />
        <div>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">{t("workers.list")}</h2>
          <WorkerList workers={workersWithPassword} tagesplanObreros={tagesplanObreros} />
        </div>
      </main>
    </>
  );
}
