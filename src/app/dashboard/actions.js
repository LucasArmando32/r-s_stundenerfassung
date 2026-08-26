"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import getDb, { restaurarFeriadoSiAplica } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { calcularHoras, esFechaFutura, dentroDeVentanaEdicion } from "@/lib/hours";

export async function saveEntry(_prevState, formData) {
  const user = await getCurrentUser();
  if (!user) return { error: "auth" };

  const fecha = formData.get("fecha")?.toString();
  const horaInicio = formData.get("horaInicio")?.toString();
  const horaFin = formData.get("horaFin")?.toString();
  const pausaMinutos = Number(formData.get("pausaMinutos") || 0);
  const nota = formData.get("nota")?.toString().trim() || null;

  if (!fecha || !horaInicio || !horaFin) {
    return { error: "missing" };
  }

  if (esFechaFutura(fecha)) {
    return { error: "future" };
  }

  if (user.rol !== "admin" && !dentroDeVentanaEdicion(fecha)) {
    return { error: "pastLimit" };
  }

  const horasCalculadas = calcularHoras(horaInicio, horaFin, pausaMinutos);
  if (horasCalculadas === null) {
    return { error: "invalidRange" };
  }

  const db = getDb();
  const existing = db
    .prepare("select id from time_entries where user_id = ? and fecha = ?")
    .get(user.id, fecha);

  if (existing) {
    db.prepare(
      `update time_entries
       set hora_inicio = ?, hora_fin = ?, pausa_minutos = ?, horas_calculadas = ?,
           nota = ?, es_feriado = 0, editado_por = ?, actualizado_en = datetime('now')
       where id = ?`
    ).run(horaInicio, horaFin, pausaMinutos, horasCalculadas, nota, user.id, existing.id);
  } else {
    db.prepare(
      `insert into time_entries
         (id, user_id, fecha, hora_inicio, hora_fin, pausa_minutos, horas_calculadas, nota, es_feriado, editado_por)
       values (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      crypto.randomUUID(),
      user.id,
      fecha,
      horaInicio,
      horaFin,
      pausaMinutos,
      horasCalculadas,
      nota,
      user.id
    );
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteEntry(id) {
  const user = await getCurrentUser();
  if (!user) return { error: "auth" };

  const db = getDb();
  const entry = db
    .prepare("select fecha from time_entries where id = ? and user_id = ?")
    .get(id, user.id);
  if (!entry) return { error: "db" };

  db.prepare("delete from time_entries where id = ? and user_id = ?").run(id, user.id);
  restaurarFeriadoSiAplica(user.id, entry.fecha);

  revalidatePath("/dashboard");
  return { success: true };
}
