#!/usr/bin/env node
// Crea (o actualiza la contraseña de) la primera cuenta de administradora.
// Uso: node scripts/create-admin.js <email> <nombre completo> <password>

import crypto from "crypto";
import bcrypt from "bcryptjs";
import getDb from "../src/lib/db.js";

const [, , email, nombre, password] = process.argv;

if (!email || !nombre || !password) {
  console.error("Uso: node scripts/create-admin.js <email> <nombre completo> <password>");
  process.exit(1);
}

const db = getDb();
const passwordHash = bcrypt.hashSync(password, 10);
const existing = db.prepare("select id from users where email = ?").get(email);

if (existing) {
  db.prepare("update users set password_hash = ?, nombre = ?, rol = 'admin', activo = 1 where id = ?")
    .run(passwordHash, nombre, existing.id);
  console.log(`Cuenta admin actualizada: ${email}`);
} else {
  db.prepare(
    `insert into users (id, email, nombre, rol, activo, password_hash)
     values (?, ?, ?, 'admin', 1, ?)`
  ).run(crypto.randomUUID(), email, nombre, passwordHash);
  console.log(`Cuenta admin creada: ${email}`);
}
