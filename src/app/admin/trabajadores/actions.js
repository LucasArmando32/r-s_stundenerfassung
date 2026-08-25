"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseUsername, usernameToEmail, generarPassword } from "@/lib/username";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("rol")
    .eq("id", user.id)
    .single();

  return profile?.rol === "admin" ? user : null;
}

export async function createWorker(_prevState, formData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "auth" };

  const nombre = formData.get("nombre")?.toString().trim();
  const apellido = formData.get("apellido")?.toString().trim();
  if (!nombre || !apellido) return { error: "missing" };

  const adminClient = createAdminClient();
  const base = baseUsername(nombre, apellido);
  if (!base || base === ".") return { error: "invalidName" };

  const password = generarPassword();
  let username = base;
  let created = null;

  for (let attempt = 0; attempt < 30 && !created; attempt += 1) {
    if (attempt > 0) username = `${base}${attempt + 1}`;
    const email = usernameToEmail(username);

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!error) {
      created = data.user;
      break;
    }

    const alreadyExists =
      error.code === "email_exists" ||
      /already been registered|already exists/i.test(error.message ?? "");

    if (!alreadyExists) {
      return { error: "db" };
    }
  }

  if (!created) return { error: "db" };

  const { error: insertError } = await adminClient.from("users").insert({
    id: created.id,
    email: usernameToEmail(username),
    nombre: `${nombre} ${apellido}`,
    rol: "trabajador",
    activo: true,
  });

  if (insertError) {
    await adminClient.auth.admin.deleteUser(created.id);
    return { error: "db" };
  }

  await adminClient
    .from("worker_credentials")
    .insert({ user_id: created.id, password_plano: password });

  revalidatePath("/admin/trabajadores");
  return { success: true, username, password, nombre: `${nombre} ${apellido}` };
}

export async function setWorkerActive(userId, activo) {
  const admin = await requireAdmin();
  if (!admin) return { error: "auth" };

  const adminClient = createAdminClient();

  const { error } = await adminClient.from("users").update({ activo }).eq("id", userId);
  if (error) return { error: "db" };

  await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: activo ? "none" : "876000h",
  });

  revalidatePath("/admin/trabajadores");
  return { success: true };
}
