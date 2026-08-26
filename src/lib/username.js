import crypto from "crypto";

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const COMBINING_MARKS = new RegExp("[\u0300-\u036f]", "g");

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function baseUsername(nombre, apellido) {
  return `${normalizar(nombre)}.${normalizar(apellido)}`;
}

export function generarPassword(longitud = 10) {
  const bytes = crypto.randomBytes(longitud);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}
