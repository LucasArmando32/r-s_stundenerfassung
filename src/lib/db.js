import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const globalForDb = globalThis;

function initSchema(db) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      nombre text not null,
      rol text not null check (rol in ('trabajador', 'admin')),
      activo integer not null default 1,
      password_hash text not null,
      creado_en text not null default (datetime('now'))
    );

    create table if not exists worker_credentials (
      user_id text primary key references users(id) on delete cascade,
      password_plano text not null,
      actualizado_en text not null default (datetime('now'))
    );

    create table if not exists holidays (
      id text primary key,
      fecha text not null unique,
      nombre text not null,
      canton text not null default 'Bern'
    );

    create table if not exists time_entries (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      fecha text not null,
      hora_inicio text,
      hora_fin text,
      pausa_minutos integer not null default 0,
      horas_calculadas real not null,
      nota text,
      es_feriado integer not null default 0,
      creado_en text not null default (datetime('now')),
      actualizado_en text not null default (datetime('now')),
      editado_por text references users(id),
      unique (user_id, fecha)
    );

    create index if not exists time_entries_fecha_idx on time_entries (fecha);
    create index if not exists time_entries_user_fecha_idx on time_entries (user_id, fecha);
  `);
}

const BERN_HOLIDAYS_2025_2027 = [
  ["2025-01-01", "Neujahrstag"],
  ["2025-01-02", "Berchtoldstag"],
  ["2025-04-18", "Karfreitag"],
  ["2025-04-21", "Ostermontag"],
  ["2025-05-29", "Auffahrt"],
  ["2025-06-09", "Pfingstmontag"],
  ["2025-08-01", "Nationalfeiertag"],
  ["2025-12-25", "Weihnachten"],
  ["2025-12-26", "Stephanstag"],
  ["2026-01-01", "Neujahrstag"],
  ["2026-01-02", "Berchtoldstag"],
  ["2026-04-03", "Karfreitag"],
  ["2026-04-06", "Ostermontag"],
  ["2026-05-14", "Auffahrt"],
  ["2026-05-25", "Pfingstmontag"],
  ["2026-08-01", "Nationalfeiertag"],
  ["2026-12-25", "Weihnachten"],
  ["2026-12-26", "Stephanstag"],
  ["2027-01-01", "Neujahrstag"],
  ["2027-01-02", "Berchtoldstag"],
  ["2027-03-26", "Karfreitag"],
  ["2027-03-29", "Ostermontag"],
  ["2027-05-06", "Auffahrt"],
  ["2027-05-17", "Pfingstmontag"],
  ["2027-08-01", "Nationalfeiertag"],
  ["2027-12-25", "Weihnachten"],
  ["2027-12-26", "Stephanstag"],
];

function esFinDeSemana(fechaISO) {
  const dow = new Date(`${fechaISO}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

function seedHolidays(db) {
  const insert = db.prepare(
    "insert or ignore into holidays (id, fecha, nombre, canton) values (?, ?, ?, 'Bern')"
  );
  const tx = db.transaction(() => {
    for (const [fecha, nombre] of BERN_HOLIDAYS_2025_2027) {
      insert.run(crypto.randomUUID(), fecha, nombre);
    }
  });
  tx();
}

function getDb() {
  if (globalForDb.__db) return globalForDb.__db;

  const db = new Database(DB_PATH);
  initSchema(db);
  seedHolidays(db);
  globalForDb.__db = db;
  return db;
}

// Materializes an 8h holiday row for every active trabajador for this
// holiday date, skipping weekends (nobody works those anyway).
export function materializarFeriado(fecha) {
  if (esFinDeSemana(fecha)) return;

  const db = getDb();
  const workers = db
    .prepare("select id from users where rol = 'trabajador' and activo = 1")
    .all();

  const insert = db.prepare(
    `insert or ignore into time_entries (id, user_id, fecha, horas_calculadas, es_feriado)
     values (?, ?, ?, 8, 1)`
  );
  const tx = db.transaction(() => {
    for (const w of workers) insert.run(crypto.randomUUID(), w.id, fecha);
  });
  tx();
}

// Materializes 8h holiday rows for a newly created worker across every
// already-known holiday (weekends skipped).
export function materializarFeriadosParaUsuario(userId) {
  const db = getDb();
  const holidays = db.prepare("select fecha from holidays").all();
  const insert = db.prepare(
    `insert or ignore into time_entries (id, user_id, fecha, horas_calculadas, es_feriado)
     values (?, ?, ?, 8, 1)`
  );
  const tx = db.transaction(() => {
    for (const h of holidays) {
      if (esFinDeSemana(h.fecha)) continue;
      insert.run(crypto.randomUUID(), userId, h.fecha);
    }
  });
  tx();
}

// Restores the automatic 8h holiday row after a worker deletes their
// manual override of a holiday date.
export function restaurarFeriadoSiAplica(userId, fecha) {
  const db = getDb();
  const holiday = db.prepare("select 1 from holidays where fecha = ?").get(fecha);
  if (!holiday || esFinDeSemana(fecha)) return;

  db.prepare(
    `insert or ignore into time_entries (id, user_id, fecha, horas_calculadas, es_feriado)
     values (?, ?, ?, 8, 1)`
  ).run(crypto.randomUUID(), userId, fecha);
}

export default getDb;
