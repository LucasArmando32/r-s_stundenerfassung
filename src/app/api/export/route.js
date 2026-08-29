import { getCurrentProfile } from "@/lib/supabase/server";
import { buildStundenrapport } from "@/lib/excel";

export async function GET(request) {
  const { user, profile } = await getCurrentProfile();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (profile?.rol !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromYm = searchParams.get("from");
  const toYm = searchParams.get("to");

  if (!fromYm || !toYm) {
    return new Response("Missing from/to", { status: 400 });
  }

  const workbook = await buildStundenrapport(fromYm, toYm);
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Stundenrapport_${fromYm}_${toYm}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
