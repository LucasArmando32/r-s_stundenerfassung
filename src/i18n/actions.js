"use server";

import { cookies } from "next/headers";
import { locales, localeCookieName } from "./config";

export async function setLocale(locale) {
  if (!locales.includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
