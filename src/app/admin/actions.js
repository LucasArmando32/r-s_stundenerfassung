"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularHoras } from "@/lib/hours";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };

  const { data: profile } = await supabase
    .from("users")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "admin") return { supabase, user: null };
  return { supabase, user };
}

export async function adminUpsertEntry(_prevState, formData) {
  const { supabase, user } = await requireAdmin();
  if (!user) return { error: "auth" };

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

  const { error } = await supabase.from("time_entries").upsert(
    {
      user_id: userId,
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

  if (error) return { error: "db" };

  revalidatePath("/admin");
  return { success: true };
}

export async function adminDeleteEntry(id) {
  const { supabase, user } = await requireAdmin();
  if (!user) return { error: "auth" };

  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) return { error: "db" };

  revalidatePath("/admin");
  return { success: true };
}
