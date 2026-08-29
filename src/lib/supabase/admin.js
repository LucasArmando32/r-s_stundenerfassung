import "server-only";
import { createClient } from "@supabase/supabase-js";

// Uses the service role key — bypasses RLS entirely. Only ever import this
// from Server Actions / route handlers that have already verified the
// caller is an authenticated admin.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
