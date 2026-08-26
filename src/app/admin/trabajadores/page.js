import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import getDb from "@/lib/db";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import CreateWorkerForm from "@/components/admin/CreateWorkerForm";
import WorkerList from "@/components/admin/WorkerList";

export default async function TrabajadoresPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.rol !== "admin") redirect("/dashboard");

  const t = await getTranslations();
  const db = getDb();

  const workers = db
    .prepare(
      `select u.id, u.nombre, u.email, u.activo, wc.password_plano as password
       from users u
       left join worker_credentials wc on wc.user_id = u.id
       where u.rol = 'trabajador'
       order by u.nombre`
    )
    .all();

  return (
    <>
      <Header profile={user} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">{t("workers.title")}</h1>
        <CreateWorkerForm />
        <div>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">{t("workers.list")}</h2>
          <WorkerList workers={workers} />
        </div>
      </main>
    </>
  );
}
