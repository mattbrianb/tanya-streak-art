// One-owner login: a password, a signed session cookie, no user table.
// The password lives as a PBKDF2 hash in settings once Tanya changes it;
// until then the ADMIN_PASSWORD secret is used.
import { getSetting, setSetting } from './util.js';

const COOKIE = 'tsa_session';
const DAYS = 30;
const enc = new TextEncoder();

function b64url(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function pbkdf2(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return b64url(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${b64url(salt)}$${await pbkdf2(password, salt)}`;
}

// The "version" changes whenever the password changes, which signs everyone out.
async function passwordVersion(env) {
  const stored = await getSetting(env.DB, 'password_hash');
  return stored ? stored.slice(-12) : 'env';
}

export async function checkPassword(env, password) {
  if (typeof password !== 'string' || !password) return false;
  const stored = await getSetting(env.DB, 'password_hash');
  if (stored) {
    const [, salt, hash] = stored.split('$');
    return safeEqual(await pbkdf2(password, fromB64url(salt)), hash);
  }
  return !!env.ADMIN_PASSWORD && safeEqual(password, env.ADMIN_PASSWORD);
}

export async function setPassword(env, password) {
  await setSetting(env.DB, 'password_hash', await hashPassword(password));
}

export async function sessionCookie(env, request) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + DAYS * 864e5, v: await passwordVersion(env) })));
  const sig = await hmac(env.SESSION_SECRET, payload);
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DAYS * 86400}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export async function isSignedIn(env, request) {
  if (!env.SESSION_SECRET) return false;
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig || !safeEqual(await hmac(env.SESSION_SECRET, payload), sig)) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return data.exp > Date.now() && data.v === await passwordVersion(env);
  } catch { return false; }
}
