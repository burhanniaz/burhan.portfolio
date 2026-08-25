import { passwordOk, makeCookie, clearCookie, isAuthed } from './_lib/auth.js';

export default async function handler(req, res){
  // GET — is this browser signed in?
  if(req.method === 'GET'){
    return res.status(200).json({ authed: isAuthed(req) });
  }

  if(req.method !== 'POST'){
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, password } = req.body || {};

  if(action === 'logout'){
    res.setHeader('Set-Cookie', clearCookie());
    return res.status(200).json({ authed: false });
  }

  if(!process.env.ADMIN_PASSWORD){
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not set on the server.' });
  }

  if(!passwordOk(password)){
    // deliberately vague, and slow enough to make guessing tedious
    await new Promise(r => setTimeout(r, 600));
    return res.status(401).json({ error: 'Incorrect password' });
  }

  res.setHeader('Set-Cookie', makeCookie());
  res.status(200).json({ authed: true });
}
