import crypto from 'node:crypto';

const COOKIE = 'mb_admin';
const MAX_AGE = 60 * 60 * 12;               // 12 hours

function secret(){
  // AUTH_SECRET is preferred; fall back to the password so a missing secret
  // still produces a working (if shorter-lived) signature rather than a crash.
  const s = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if(!s) throw new Error('Set ADMIN_PASSWORD (and ideally AUTH_SECRET) in your environment.');
  return s;
}

function sign(value){
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

/** Constant-time compare so a wrong password cannot be timed character by character. */
export function passwordOk(given){
  const want = process.env.ADMIN_PASSWORD || '';
  if(!want || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

export function makeCookie(){
  const exp = Date.now() + MAX_AGE * 1000;
  const body = `${exp}`;
  const token = `${body}.${sign(body)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${MAX_AGE}`;
}

export function clearCookie(){
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`;
}

export function isAuthed(req){
  const raw = req.headers.cookie || '';
  const hit = raw.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if(!hit) return false;

  const token = hit.slice(COOKIE.length + 1);
  const dot = token.lastIndexOf('.');
  if(dot < 1) return false;

  const body = token.slice(0, dot);
  const mac  = token.slice(dot + 1);

  const expected = sign(body);
  if(mac.length !== expected.length) return false;
  if(!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;

  return Number(body) > Date.now();
}

/** Guard for every write endpoint. Returns true when the request may proceed. */
export function requireAuth(req, res){
  if(isAuthed(req)) return true;
  res.status(401).json({ error: 'Not signed in' });
  return false;
}
