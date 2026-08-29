import ExcelJS from "exceljs";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  addDays,
  format,
  endOfMonth,
} from "date-fns";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

const HOLIDAY_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5DCDC" },
};

const NAME_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF3B0" },
};

const WEEKDAY_NAMES_DE = [
  "Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag",
];

const MITTAGESSEN_MIN_HORAS = 5.5;

function sanitizeSheetName(name) {
  return name.replace(/[*?:\\/[\]]/g, "").slice(0, 31) || "Mitarbeiter";
}

// Approximates a morning/afternoon split from a single start/end/break
// entry — we don't store when the break actually started, so the break is
// centered in the middle of the working span (always fits, always
// deterministic). This is a display approximation, not the literal break
// time the person took.
function splitJornada(horaInicio, horaFin, pausaMinutos) {
  const [h1, m1] = horaInicio.split(":").map(Number);
  const [h2, m2] = horaFin.split(":").map(Number);
  const inicioMin = h1 * 60 + m1;
  const finMin = h2 * 60 + m2;
  const mid = (inicioMin + finMin) / 2;
  const pausa = Number(pausaMinutos) || 0;

  const toHHMM = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return {
    von1: toHHMM(inicioMin),
    bis1: toHHMM(mid - pausa / 2),
    von2: toHHMM(mid + pausa / 2),
    bis2: toHHMM(finMin),
  };
}

function weeksInRange(fromYm, toYm) {
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  const rangeStart = new Date(fy, fm - 1, 1);
  const rangeEnd = endOfMonth(new Date(ty, tm - 1, 1));

  const weeks = [];
  let cursor = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(rangeEnd, { weekStartsOn: 1 });
  while (cursor <= lastWeekStart) {
    weeks.push({ start: cursor, end: endOfWeek(cursor, { weekStartsOn: 1 }) });
    cursor = addWeeks(cursor, 1);
  }
  return weeks;
}

export async function buildStundenrapport(fromYm, toYm) {
  const supabase = await createClient();
  const weeks = weeksInRange(fromYm, toYm);
  const workbook = new ExcelJS.Workbook();

  if (weeks.length === 0) {
    workbook.addWorksheet("Leer");
    return workbook;
  }

  const overallStart = format(weeks[0].start, "yyyy-MM-dd");
  const overallEnd = format(weeks[weeks.length - 1].end, "yyyy-MM-dd");

  const { data: workers = [] } = await supabase
    .from("users")
    .select("id, nombre, tagesplan_obrero_id")
    .eq("rol", "trabajador")
    .order("nombre");

  const { data: allEntries = [] } = await supabase
    .from("time_entries")
    .select("*")
    .gte("fecha", overallStart)
    .lte("fecha", overallEnd);

  const reiseData = await fetchReisezeit(
    (workers ?? []).map((w) => w.tagesplan_obrero_id).filter(Boolean),
    overallStart,
    overallEnd
  );

  for (const worker of workers ?? []) {
    const byFecha = Object.fromEntries(
      (allEntries ?? []).filter((e) => e.user_id === worker.id).map((e) => [e.fecha, e])
    );
    const reiseByFecha = Object.fromEntries(
      reiseData
        .filter((r) => r.obrero_id === worker.tagesplan_obrero_id)
        .map((r) => [r.fecha, r.reisezeit_minutos])
    );
    const standortByFecha = Object.fromEntries(
      reiseData
        .filter((r) => r.obrero_id === worker.tagesplan_obrero_id)
        .map((r) => [r.fecha, r.obra_nombre])
    );

    const sheet = workbook.addWorksheet(sanitizeSheetName(worker.nombre));
    sheet.columns = [
      { width: 12 }, { width: 12 }, { width: 8 }, { width: 8 },
      { width: 8 }, { width: 8 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 22 },
    ];

    const nameRow = sheet.addRow([worker.nombre]);
    nameRow.getCell(1).font = { bold: true };
    nameRow.getCell(1).fill = NAME_FILL;
    sheet.addRow([]);

    for (const week of weeks) {
      const headerRow = sheet.addRow([
        "Tag", "Datum", "von", "bis", "von", "bis", "Stunden", "Reisezeit", "Standort", "Notiz",
      ]);
      headerRow.font = { bold: true };

      let weekTotal = 0;
      let weekReise = 0;
      let mittagessen = 0;

      for (let i = 0; i < 7; i += 1) {
        const day = addDays(week.start, i);
        const fecha = format(day, "yyyy-MM-dd");
        const entry = byFecha[fecha];
        const reiseMin = reiseByFecha[fecha] || 0;
        const standort = standortByFecha[fecha];
        const row = sheet.addRow([
          WEEKDAY_NAMES_DE[day.getDay()],
          format(day, "dd.MM.yyyy"),
        ]);

        if (entry) {
          const horas = Number(entry.horas_calculadas);
          weekTotal += horas;
          if (horas >= MITTAGESSEN_MIN_HORAS) mittagessen += 1;
          row.getCell(7).value = horas;
          row.getCell(10).value = entry.nota || "";

          if (entry.es_feriado) {
            row.getCell(3).value = "Feiertag";
            sheet.mergeCells(row.number, 3, row.number, 6);
            row.getCell(3).fill = HOLIDAY_FILL;
          } else {
            const { von1, bis1, von2, bis2 } = splitJornada(
              entry.hora_inicio,
              entry.hora_fin,
              entry.pausa_minutos
            );
            row.getCell(3).value = von1;
            row.getCell(4).value = bis1;
            row.getCell(5).value = von2;
            row.getCell(6).value = bis2;
          }
        }

        if (reiseMin > 0) {
          weekReise += reiseMin;
          row.getCell(8).value = `${reiseMin} min`;
        }
        if (standort) {
          row.getCell(9).value = standort;
        }
      }

      const totalRow = sheet.addRow([
        "Total", "", "", "", "", "",
        Math.round(weekTotal * 100) / 100,
        weekReise > 0 ? `${weekReise} min` : "",
      ]);
      totalRow.font = { bold: true };
      sheet.addRow([`Anzahl Mittagessen: ${mittagessen}`]);
      sheet.addRow([]);
    }

    const sigRow = sheet.addRow(["Datum", format(new Date(), "dd.MM.yyyy"), "", "Unterschrift Arbeitgeber/In"]);
    sigRow.getCell(1).font = { bold: true };
    sigRow.getCell(4).font = { bold: true };
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet("Leer");
  }

  return workbook;
}

// obras.reisezeit_minutos is the one-way time from Lager to the Baustelle
// (set once by the jefa). The paid travel time is the round trip minus a
// 30-minute unpaid allowance, floored at 0 if the round trip alone doesn't
// reach 30 minutes.
function calcularReisezeitPagada(minutosIda) {
  const idaYVuelta = minutosIda * 2;
  return idaYVuelta < 30 ? 0 : idaYVuelta - 30;
}

// Reisezeit and Standort live in the Tagesplan app's tables, on the same
// shared Supabase/Postgres instance. Every day a worker was assigned to a
// real Baustelle (asignaciones_diarias), that site's name and fixed
// reisezeit_minutos apply — set once by the jefa per site (Lager -> Baustelle).
async function fetchReisezeit(obreroIds, from, to) {
  if (!obreroIds.length) return [];

  // Tagesplan's RLS only recognizes admins listed in *its own* usuarios
  // table, which this app's session isn't part of — use the service role
  // to read across apps instead of trying to satisfy that policy.
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("asignaciones_diarias")
    .select("obrero_id, fecha, obras(nombre, reisezeit_minutos)")
    .in("obrero_id", obreroIds)
    .gte("fecha", from)
    .lte("fecha", to);

  if (error || !data) return [];

  return data.map((row) => ({
    obrero_id: row.obrero_id,
    fecha: row.fecha,
    reisezeit_minutos: calcularReisezeitPagada(row.obras?.reisezeit_minutos || 0),
    obra_nombre: row.obras?.nombre || "",
  }));
}
