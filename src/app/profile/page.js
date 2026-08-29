import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Header";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function ProfilePage() {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");

  const t = await getTranslations();

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-6">
        <h1 className="text-xl font-bold text-neutral-900">{t("profile.title")}</h1>
        <ChangePasswordForm />
      </main>
    </>
  );
}
