"use client";

import { useTranslations } from "next-intl";
import { logout } from "@/app/login/logout-action";

export default function LogoutButton() {
  const t = useTranslations("common");

  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm font-medium text-neutral-500 hover:text-brand"
      >
        {t("logout")}
      </button>
    </form>
  );
}
