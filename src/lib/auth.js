import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import getDb from "./db";

export const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET no está configurada.");
  }
  return secret;
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payloadEncoded) {
  return base64url(
    crypto.createHmac("sha256", getSessionSecret()).update(payloadEncoded).digest()
  );
}

function createSessionToken(userId) {
  const payloadEncoded = base64url(JSON.stringify({ userId, iat: Date.now() }));
  return `${payloadEncoded}.${sign(payloadEncoded)}`;
}

export function verifySessionToken(token) {
  if (!token) return null;
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return null;
  if (sign(payloadEncoded) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, "base64").toString("utf8"));
    return payload.userId ? payload : null;
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Loads the current session's user row (or null if not logged in / stale
// session referring to a deleted user).
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session) return null;

  const db = getDb();
  const user = db
    .prepare("select id, email, nombre, rol, activo from users where id = ?")
    .get(session.userId);

  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("auth");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.rol !== "admin") throw new AuthError("auth");
  return user;
}

export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
