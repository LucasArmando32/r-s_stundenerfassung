import { getTranslations } from "next-intl/server";
import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import LogoutButton from "./LogoutButton";

export default async function Header({ profile }) {
  const t = await getTranslations();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
            RS
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-neutral-600">
            {profile?.rol === "admin" ? (
              <>
                <Link href="/admin" className="hover:text-brand">
                  {t("header.admin")}
                </Link>
                <Link href="/admin/trabajadores" className="hover:text-brand">
                  {t("header.workers")}
                </Link>
              </>
            ) : (
              <Link href="/dashboard" className="hover:text-brand">
                {t("header.dashboard")}
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="hidden text-sm text-neutral-500 hover:text-brand sm:inline"
          >
            {profile?.nombre}
          </Link>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
