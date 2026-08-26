import ExcelJS from "exceljs";
import { getDaysInMonth } from "date-fns";
import getDb from "./db";

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

export async function buildStundenrapport(fromYm, toYm) {
  const db = getDb();
  const months = monthsBetween(fromYm, toYm).slice(0, 24);

  const workers = db
    .prepare("select nombre from users where rol = 'trabajador' order by nombre")
    .all();
  const workerNames = workers.map((w) => w.nombre);

  const workbook = new ExcelJS.Workbook();

  for (const { year, month } of months) {
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const entries = db
      .prepare(
        `select te.fecha, te.horas_calculadas, te.es_feriado, u.nombre
         from time_entries te
         join users u on u.id = te.user_id
         where te.fecha >= ? and te.fecha <= ?`
      )
      .all(monthStart, monthEnd);

    const sheetName = `${MONTH_NAMES_DE[month - 1]} ${year}`.slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = [
      { header: "Tag", key: "day", width: 8 },
      ...workerNames.map((name) => ({ header: name, key: name, width: 14 })),
    ];
    sheet.getRow(1).font = { bold: true };

    const byDayWorker = {};
    for (const e of entries) {
      const day = Number(e.fecha.slice(8, 10));
      byDayWorker[`${day}|${e.nombre}`] = e;
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
      totalRow[name] = entries
        .filter((e) => e.nombre === name)
        .reduce((acc, e) => acc + Number(e.horas_calculadas), 0);
    }
    const totalExcelRow = sheet.addRow(totalRow);
    totalExcelRow.font = { bold: true };
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet("Leer");
  }

  return workbook;
}
