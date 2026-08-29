"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularHoras, esFechaFutura, dentroDeVentanaEdicion } from "@/lib/hours";

export async function saveEntry(_prevState, formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  if (!dentroDeVentanaEdicion(fecha)) {
    return { error: "pastLimit" };
  }

  const horasCalculadas = calcularHoras(horaInicio, horaFin, pausaMinutos);
  if (horasCalculadas === null) {
    return { error: "invalidRange" };
  }

  const { error } = await supabase.from("time_entries").upsert(
    {
      user_id: user.id,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      pausa_minutos: pausaMinutos,
      horas_calculadas: horasCalculadas,
      nota,
      es_feriado: false,
      editado_por: user.id,
    },
    { onConflict: "user_id,fecha" }
  );

  if (error) {
    return { error: "db" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteEntry(id) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "db" };

  revalidatePath("/dashboard");
  return { success: true };
}
