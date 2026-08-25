import { readFile } from 'node:fs/promises';
import path from 'node:path';

/*
  One source of truth for the starting content: /data/seed.json.
  The browser falls back to the same file when the API is unreachable, so the
  site and the database can never drift apart on their defaults.

  vercel.json's includeFiles keeps this file in the function bundle.
*/
async function load(){
  const candidates = [
    path.join(process.cwd(), 'data', 'seed.json'),
    new URL('../../data/seed.json', import.meta.url)
  ];

  for(const c of candidates){
    try{
      return JSON.parse(await readFile(c, 'utf8'));
    }catch{ /* try the next location */ }
  }
  throw new Error('Could not read data/seed.json');
}

export const SEED = await load();
