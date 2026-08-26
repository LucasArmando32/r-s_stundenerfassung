"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import getDb, { restaurarFeriadoSiAplica } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { calcularHoras } from "@/lib/hours";

export async function adminUpsertEntry(_prevState, formData) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code };
    throw e;
  }

  const userId = formData.get("userId")?.toString();
  const fecha = formData.get("fecha")?.toString();
  const horaInicio = formData.get("horaInicio")?.toString();
  const horaFin = formData.get("horaFin")?.toString();
  const pausaMinutos = Number(formData.get("pausaMinutos") || 0);
  const nota = formData.get("nota")?.toString().trim() || null;

  if (!userId || !fecha || !horaInicio || !horaFin) {
    return { error: "missing" };
  }

  const horasCalculadas = calcularHoras(horaInicio, horaFin, pausaMinutos);
  if (horasCalculadas === null) {
    return { error: "invalidRange" };
  }

  const db = getDb();
  const existing = db
    .prepare("select id from time_entries where user_id = ? and fecha = ?")
    .get(userId, fecha);

  if (existing) {
    db.prepare(
      `update time_entries
       set hora_inicio = ?, hora_fin = ?, pausa_minutos = ?, horas_calculadas = ?,
           nota = ?, es_feriado = 0, editado_por = ?, actualizado_en = datetime('now')
       where id = ?`
    ).run(horaInicio, horaFin, pausaMinutos, horasCalculadas, nota, admin.id, existing.id);
  } else {
    db.prepare(
      `insert into time_entries
         (id, user_id, fecha, hora_inicio, hora_fin, pausa_minutos, horas_calculadas, nota, es_feriado, editado_por)
       values (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      crypto.randomUUID(),
      userId,
      fecha,
      horaInicio,
      horaFin,
      pausaMinutos,
      horasCalculadas,
      nota,
      admin.id
    );
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function adminDeleteEntry(id) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code };
    throw e;
  }

  const db = getDb();
  const entry = db.prepare("select user_id, fecha from time_entries where id = ?").get(id);
  if (!entry) return { error: "db" };

  db.prepare("delete from time_entries where id = ?").run(id);
  restaurarFeriadoSiAplica(entry.user_id, entry.fecha);

  revalidatePath("/admin");
  return { success: true };
}
