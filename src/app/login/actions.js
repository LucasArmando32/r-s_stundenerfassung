"use server";

import { redirect } from "next/navigation";
import getDb from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export async function login(_prevState, formData) {
  const identifier = formData.get("identifier")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!identifier || !password) {
    return { error: true };
  }

  const db = getDb();
  const user = db
    .prepare("select id, rol, activo, password_hash from users where email = ?")
    .get(identifier);

  if (!user || !user.activo) {
    return { error: true };
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return { error: true };
  }

  await createSession(user.id);
  redirect(user.rol === "admin" ? "/admin" : "/dashboard");
}
