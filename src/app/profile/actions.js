"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function changeOwnPassword(_prevState, formData) {
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!password || password.length < 8) return { error: "tooShort" };
  if (password !== confirmPassword) return { error: "mismatch" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "db" };

  // Keeps the admin-visible plaintext mirror in sync when a worker changes
  // their own password. Uses the admin client because worker_credentials'
  // RLS only allows admin access, but this only ever touches the caller's
  // own row (scoped by their verified session user.id).
  const adminClient = createAdminClient();
  await adminClient
    .from("worker_credentials")
    .update({ password_plano: password, actualizado_en: new Date().toISOString() })
    .eq("user_id", user.id);

  return { success: true };
}
