import pg from 'pg';
import { SEED } from './seed.js';

/*
  @vercel/postgres only speaks to Neon's HTTP-based proxy (that's what backs
  Vercel's own "Postgres" storage product) — it cannot reach a regular
  Postgres server, which is what Supabase is. Pointing it at a Supabase
  connection string fails every query with a bare "fetch failed", since it's
  trying an HTTP fetch() against an endpoint that doesn't exist there.

  `pg` speaks the real Postgres wire protocol over TCP, so it works with
  Supabase (or any other standard Postgres) using the same POSTGRES_URL.
*/
const { Pool } = pg;

let pool;
function getPool(){
  if(!pool){
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },   // Supabase's pooler requires TLS
      max: 3                                // small — this runs in a serverless function, not a long-lived server
    });
  }
  return pool;
}

/** Tagged-template query, e.g. sql`SELECT * FROM x WHERE id = ${id}` */
function sql(strings, ...values){
  let text = '';
  strings.forEach((chunk, i) => {
    text += chunk;
    if(i < values.length) text += '$' + (i + 1);
  });
  return getPool().query(text, values);
}

/** Plain parameterised query, e.g. sql.query('UPDATE x SET y = $1', [v]) */
sql.query = (text, params) => getPool().query(text, params);

let ready = null;

/**
 * Creates the schema on first use and seeds it once with the site's original
 * content, so a fresh deploy shows a populated site instead of empty panels.
 * Every endpoint awaits this, and it only ever runs its work once per instance.
 */
export function init(){
  if(ready) return ready;
  ready = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS categories (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      kind        TEXT DEFAULT 'Core domain',
      viz         TEXT DEFAULT 'core',
      description TEXT DEFAULT '',
      tags        JSONB DEFAULT '[]'::jsonb,
      keywords    JSONB DEFAULT '[]'::jsonb,
      sort        INTEGER DEFAULT 0
    )`;

    await sql`CREATE TABLE IF NOT EXISTS subcategories (
      id          SERIAL PRIMARY KEY,
      category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      sort        INTEGER DEFAULT 0
    )`;

    await sql`CREATE TABLE IF NOT EXISTS projects (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      areas       JSONB DEFAULT '[]'::jsonb,
      subs        JSONB DEFAULT '[]'::jsonb,
      tags        JSONB DEFAULT '[]'::jsonb,
      media       JSONB DEFAULT '[]'::jsonb,
      live_url    TEXT DEFAULT '#',
      code_url    TEXT DEFAULT '#',
      review      JSONB,
      sort        INTEGER DEFAULT 0
    )`;

    await sql`CREATE TABLE IF NOT EXISTS experience (
      id          SERIAL PRIMARY KEY,
      date_label  TEXT NOT NULL,
      role        TEXT NOT NULL,
      org         TEXT DEFAULT '',
      description TEXT DEFAULT '',
      areas       JSONB DEFAULT '[]'::jsonb,
      sort        INTEGER DEFAULT 0
    )`;

    await sql`CREATE TABLE IF NOT EXISTS courses (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      org         TEXT DEFAULT '',
      year        TEXT DEFAULT '',
      status      TEXT DEFAULT 'Completed',
      description TEXT DEFAULT '',
      areas       JSONB DEFAULT '[]'::jsonb,
      tags        JSONB DEFAULT '[]'::jsonb,
      sort        INTEGER DEFAULT 0
    )`;

    const { rows } = await sql`SELECT COUNT(*)::int AS n FROM categories`;
    if(rows[0].n === 0) await seed();
  })();
  return ready;
}

async function seed(){
  let i = 0;
  for(const c of SEED.categories){
    await sql`INSERT INTO categories (id, name, kind, viz, description, tags, keywords, sort)
              VALUES (${c.id}, ${c.name}, ${c.kind}, ${c.viz}, ${c.desc},
                      ${JSON.stringify(c.tags)}::jsonb, ${JSON.stringify(c.keys)}::jsonb, ${i++})
              ON CONFLICT (id) DO NOTHING`;
  }

  for(const [categoryId, names] of Object.entries(SEED.subcats)){
    let s = 0;
    for(const name of names){
      await sql`INSERT INTO subcategories (category_id, name, sort)
                VALUES (${categoryId}, ${name}, ${s++})`;
    }
  }

  i = 0;
  for(const p of SEED.projects){
    await sql`INSERT INTO projects (name, title, description, areas, subs, tags, media, live_url, code_url, review, sort)
              VALUES (${p.name}, ${p.title}, ${p.desc},
                      ${JSON.stringify(p.areas)}::jsonb, ${JSON.stringify(p.subs)}::jsonb,
                      ${JSON.stringify(p.tags)}::jsonb, ${JSON.stringify(p.media)}::jsonb,
                      ${p.live}, ${p.code},
                      ${p.review ? JSON.stringify(p.review) : null}::jsonb, ${i++})`;
  }

  i = 0;
  for(const x of SEED.experience){
    await sql`INSERT INTO experience (date_label, role, org, description, areas, sort)
              VALUES (${x.date}, ${x.role}, ${x.org}, ${x.desc}, ${JSON.stringify(x.areas)}::jsonb, ${i++})`;
  }

  i = 0;
  for(const c of SEED.courses){
    await sql`INSERT INTO courses (name, org, year, status, description, areas, tags, sort)
              VALUES (${c.name}, ${c.org}, ${c.year}, ${c.status}, ${c.desc},
                      ${JSON.stringify(c.areas)}::jsonb, ${JSON.stringify(c.tags)}::jsonb, ${i++})`;
  }
}

/** The single payload both the public site and the admin read. */
export async function readAll(){
  await init();
  const [cats, subs, projects, experience, courses] = await Promise.all([
    sql`SELECT * FROM categories    ORDER BY sort, name`,
    sql`SELECT * FROM subcategories ORDER BY sort, name`,
    sql`SELECT * FROM projects      ORDER BY sort, id`,
    sql`SELECT * FROM experience    ORDER BY sort, id`,
    sql`SELECT * FROM courses       ORDER BY sort, id`
  ]);

  const subcats = {};
  for(const s of subs.rows){
    (subcats[s.category_id] ||= []).push(s.name);
  }

  return {
    categories: cats.rows.map(c => ({
      id: c.id, name: c.name, kind: c.kind, viz: c.viz,
      desc: c.description, tags: c.tags || [], keys: c.keywords || []
    })),
    subcatRows: subs.rows,
    subcats,
    projects: projects.rows.map(p => ({
      id: p.id, name: p.name, title: p.title, desc: p.description,
      areas: p.areas || [], subs: p.subs || [], tags: p.tags || [],
      media: p.media || [], live: p.live_url, code: p.code_url,
      review: p.review || null
    })),
    experience: experience.rows.map(x => ({
      id: x.id, date: x.date_label, role: x.role, org: x.org,
      desc: x.description, areas: x.areas || []
    })),
    courses: courses.rows.map(c => ({
      id: c.id, name: c.name, org: c.org, year: c.year, status: c.status,
      desc: c.description, areas: c.areas || [], tags: c.tags || []
    }))
  };
}

export { sql };
