import ExcelJS from "exceljs";
import { getDaysInMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";

const MONTH_NAMES_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const HOLIDAY_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5DCDC" },
};

function monthsBetween(fromYm, toYm) {
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  const months = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromYm = searchParams.get("from");
  const toYm = searchParams.get("to");

  if (!fromYm || !toYm) {
    return new Response("Missing from/to", { status: 400 });
  }

  const months = monthsBetween(fromYm, toYm).slice(0, 24);

  const { data: workers = [] } = await supabase
    .from("users")
    .select("nombre")
    .eq("rol", "trabajador")
    .order("nombre");
  const workerNames = (workers ?? []).map((w) => w.nombre);

  const workbook = new ExcelJS.Workbook();

  for (const { year, month } of months) {
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const { data: entries = [] } = await supabase
      .from("time_entries")
      .select("fecha, horas_calculadas, es_feriado, users!time_entries_user_id_fkey(id, nombre)")
      .gte("fecha", monthStart)
      .lte("fecha", monthEnd);

    const sheetName = `${MONTH_NAMES_DE[month - 1]} ${year}`.slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = [
      { header: "Tag", key: "day", width: 8 },
      ...workerNames.map((name) => ({ header: name, key: name, width: 14 })),
    ];
    sheet.getRow(1).font = { bold: true };

    const byDayWorker = {};
    for (const e of entries ?? []) {
      const day = Number(e.fecha.slice(8, 10));
      const name = e.users?.nombre;
      if (!name) continue;
      byDayWorker[`${day}|${name}`] = e;
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const row = { day };
      for (const name of workerNames) {
        const entry = byDayWorker[`${day}|${name}`];
        row[name] = entry ? Number(entry.horas_calculadas) : null;
      }
      const excelRow = sheet.addRow(row);
      for (const name of workerNames) {
        const entry = byDayWorker[`${day}|${name}`];
        if (entry?.es_feriado) {
          excelRow.getCell(name).fill = HOLIDAY_FILL;
        }
      }
    }

    const totalRow = { day: "Total" };
    for (const name of workerNames) {
      totalRow[name] = (entries ?? [])
        .filter((e) => e.users?.nombre === name)
        .reduce((acc, e) => acc + Number(e.horas_calculadas), 0);
    }
    const totalExcelRow = sheet.addRow(totalRow);
    totalExcelRow.font = { bold: true };
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet("Leer");
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Stundenrapport_${fromYm}_${toYm}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
