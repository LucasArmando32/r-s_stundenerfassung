"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const t = useTranslations("common");
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm font-medium text-neutral-500 hover:text-brand"
    >
      {t("logout")}
    </button>
  );
}
