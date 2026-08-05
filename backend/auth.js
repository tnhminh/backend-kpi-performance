import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const encode = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const decode = value => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

export function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password, salt, 64).toString('base64url');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, encoded) {
  const [scheme, salt, expected] = String(encoded || '').split(':');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString('base64url');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function signJwt(payload, secret, expiresInSeconds = 60 * 60 * 8) {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds });
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token, secret) {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) return null;
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;
  try {
    const payload = decode(body);
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
}

export function readCookie(header, name) {
  return String(header || '').split(';').map(item => item.trim()).reduce((value, item) => {
    const index = item.indexOf('=');
    return index > 0 && item.slice(0, index) === name ? decodeURIComponent(item.slice(index + 1)) : value;
  }, null);
}
