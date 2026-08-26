"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import getDb, { materializarFeriadosParaUsuario } from "@/lib/db";
import { requireAdmin, AuthError, hashPassword } from "@/lib/auth";
import { baseUsername, generarPassword } from "@/lib/username";

export async function createWorker(_prevState, formData) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code };
    throw e;
  }

  const nombre = formData.get("nombre")?.toString().trim();
  const apellido = formData.get("apellido")?.toString().trim();
  if (!nombre || !apellido) return { error: "missing" };

  const base = baseUsername(nombre, apellido);
  if (!base || base === ".") return { error: "invalidName" };

  const db = getDb();
  const exists = db.prepare("select 1 from users where email = ?");

  let username = base;
  for (let attempt = 1; exists.get(username); attempt += 1) {
    username = `${base}${attempt + 1}`;
  }

  const password = generarPassword();
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const fullName = `${nombre} ${apellido}`;

  const tx = db.transaction(() => {
    db.prepare(
      `insert into users (id, email, nombre, rol, activo, password_hash)
       values (?, ?, ?, 'trabajador', 1, ?)`
    ).run(userId, username, fullName, passwordHash);

    db.prepare(
      `insert into worker_credentials (user_id, password_plano) values (?, ?)`
    ).run(userId, password);
  });
  tx();

  materializarFeriadosParaUsuario(userId);

  revalidatePath("/admin/trabajadores");
  return { success: true, username, password, nombre: fullName };
}

export async function setWorkerActive(userId, activo) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code };
    throw e;
  }

  const db = getDb();
  db.prepare("update users set activo = ? where id = ?").run(activo ? 1 : 0, userId);

  revalidatePath("/admin/trabajadores");
  return { success: true };
}
