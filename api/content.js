import { readAll } from './_lib/db.js';

/** Public read endpoint — everything the site needs, in one request. */
export default async function handler(req, res){
  if(req.method !== 'GET'){
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try{
    const data = await readAll();
    // short cache so repeat visits are instant, but an admin edit shows up quickly
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    res.status(200).json(data);
  }catch(err){
    console.error('content:', err);
    // TEMP: surfacing the real error to diagnose the Supabase connection —
    // revert to the generic message once this is working.
    res.status(500).json({ error: 'Could not load content', detail: err.message, code: err.code });
  }
}
