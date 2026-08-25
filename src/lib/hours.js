import { differenceInMinutes, parseISO, startOfDay } from "date-fns";

const EDIT_WINDOW_DAYS = 5;

// hora_inicio / hora_fin as "HH:MM" strings, pausaMinutos as integer.
// Returns worked hours rounded to 2 decimals.
export function calcularHoras(horaInicio, horaFin, pausaMinutos) {
  const [h1, m1] = horaInicio.split(":").map(Number);
  const [h2, m2] = horaFin.split(":").map(Number);
  const inicioMin = h1 * 60 + m1;
  const finMin = h2 * 60 + m2;
  const bruto = finMin - inicioMin;
  if (bruto <= 0) return null;

  const neto = bruto - (Number(pausaMinutos) || 0);
  if (neto < 0) return null;

  return Math.round((neto / 60) * 100) / 100;
}

export function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function esFechaFutura(fechaISO) {
  return fechaISO > hoyISO();
}

// "2026-08-01" -> "01.08.2026"
export function formatFecha(fechaISO) {
  const [y, m, d] = fechaISO.split("-");
  return `${d}.${m}.${y}`;
}

// Whether a `trabajador` (not admin) is still allowed to create/edit the
// entry for this date. Admins bypass this check entirely.
export function dentroDeVentanaEdicion(fechaISO) {
  const fecha = startOfDay(parseISO(fechaISO));
  const hoy = startOfDay(new Date());
  const diffDias = differenceInMinutes(hoy, fecha) / (60 * 24);
  return diffDias >= 0 && diffDias <= EDIT_WINDOW_DAYS;
}

export { EDIT_WINDOW_DAYS };
