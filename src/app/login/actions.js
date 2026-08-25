"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/username";

export async function login(_prevState, formData) {
  const identifier = formData.get("identifier")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!identifier || !password) {
    return { error: true };
  }

  const email = identifier.includes("@") ? identifier : usernameToEmail(identifier);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: true };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("rol, activo")
    .eq("id", data.user.id)
    .single();

  if (!profile?.activo) {
    await supabase.auth.signOut();
    return { error: true };
  }

  redirect(profile.rol === "admin" ? "/admin" : "/dashboard");
}
