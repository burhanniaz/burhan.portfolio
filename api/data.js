import { sql, init, readAll } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

const J = v => JSON.stringify(v ?? []);
const arr = v => Array.isArray(v) ? v : [];

function slugify(s){
  return String(s).toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
}

/* ---- Referential clean-up -------------------------------------------------
   Categories are referenced by id and sub-categories by name inside jsonb
   arrays, so renaming or deleting one has to be reflected in every project,
   role and course that mentions it — otherwise rows quietly stop matching. */

async function dropCategoryRefs(id){
  for(const t of ['projects', 'experience', 'courses']){
    const { rows } = await sql.query(
      `SELECT id, areas FROM ${t} WHERE areas @> $1::jsonb`, [JSON.stringify([id])]
    );
    for(const r of rows){
      const next = arr(r.areas).filter(a => a !== id);
      await sql.query(`UPDATE ${t} SET areas = $1::jsonb WHERE id = $2`, [JSON.stringify(next), r.id]);
    }
  }
}

async function renameSubInProjects(oldName, newName){
  const { rows } = await sql.query(
    `SELECT id, subs FROM projects WHERE subs @> $1::jsonb`, [JSON.stringify([oldName])]
  );
  for(const r of rows){
    const next = arr(r.subs).map(s => (s === oldName ? newName : s));
    await sql.query(`UPDATE projects SET subs = $1::jsonb WHERE id = $2`, [JSON.stringify(next), r.id]);
  }
}

async function dropSubFromProjects(name){
  const { rows } = await sql.query(
    `SELECT id, subs FROM projects WHERE subs @> $1::jsonb`, [JSON.stringify([name])]
  );
  for(const r of rows){
    const next = arr(r.subs).filter(s => s !== name);
    await sql.query(`UPDATE projects SET subs = $1::jsonb WHERE id = $2`, [JSON.stringify(next), r.id]);
  }
}

/* ---- Create / update per resource ---------------------------------------- */

const RESOURCES = {
  categories: {
    async create(b){
      const id = slugify(b.id || b.name);
      const { rows } = await sql`SELECT COALESCE(MAX(sort), -1) + 1 AS s FROM categories`;
      await sql`INSERT INTO categories (id, name, kind, viz, description, tags, keywords, sort)
                VALUES (${id}, ${b.name}, ${b.kind || 'Core domain'}, ${b.viz || 'core'},
                        ${b.desc || ''}, ${J(b.tags)}::jsonb, ${J(b.keys)}::jsonb, ${rows[0].s})`;
      return { id };
    },
    async update(id, b){
      // the id stays fixed — projects, roles and courses all point at it
      await sql`UPDATE categories SET name = ${b.name}, kind = ${b.kind}, viz = ${b.viz},
                description = ${b.desc || ''}, tags = ${J(b.tags)}::jsonb, keywords = ${J(b.keys)}::jsonb
                WHERE id = ${id}`;
    },
    async remove(id){
      await dropCategoryRefs(id);
      await sql`DELETE FROM categories WHERE id = ${id}`;   // sub-categories cascade
    }
  },

  subcategories: {
    async create(b){
      const { rows } = await sql`SELECT COALESCE(MAX(sort), -1) + 1 AS s
                                 FROM subcategories WHERE category_id = ${b.category_id}`;
      const ins = await sql`INSERT INTO subcategories (category_id, name, sort)
                            VALUES (${b.category_id}, ${b.name}, ${rows[0].s}) RETURNING id`;
      return { id: ins.rows[0].id };
    },
    async update(id, b){
      const { rows } = await sql`SELECT name FROM subcategories WHERE id = ${id}`;
      const before = rows[0]?.name;
      await sql`UPDATE subcategories SET name = ${b.name} WHERE id = ${id}`;
      if(before && before !== b.name) await renameSubInProjects(before, b.name);
    },
    async remove(id){
      const { rows } = await sql`SELECT name FROM subcategories WHERE id = ${id}`;
      await sql`DELETE FROM subcategories WHERE id = ${id}`;
      if(rows[0]?.name) await dropSubFromProjects(rows[0].name);
    }
  },

  projects: {
    async create(b){
      const { rows } = await sql`SELECT COALESCE(MAX(sort), -1) + 1 AS s FROM projects`;
      const ins = await sql`INSERT INTO projects
        (name, title, description, areas, subs, tags, media, live_url, code_url, review, sort)
        VALUES (${b.name}, ${b.title || b.name}, ${b.desc || ''}, ${J(b.areas)}::jsonb,
                ${J(b.subs)}::jsonb, ${J(b.tags)}::jsonb, ${J(b.media)}::jsonb,
                ${b.live || '#'}, ${b.code || '#'},
                ${b.review ? JSON.stringify(b.review) : null}::jsonb, ${rows[0].s})
        RETURNING id`;
      return { id: ins.rows[0].id };
    },
    async update(id, b){
      await sql`UPDATE projects SET name = ${b.name}, title = ${b.title || b.name},
                description = ${b.desc || ''}, areas = ${J(b.areas)}::jsonb, subs = ${J(b.subs)}::jsonb,
                tags = ${J(b.tags)}::jsonb, media = ${J(b.media)}::jsonb,
                live_url = ${b.live || '#'}, code_url = ${b.code || '#'},
                review = ${b.review ? JSON.stringify(b.review) : null}::jsonb
                WHERE id = ${id}`;
    },
    async remove(id){ await sql`DELETE FROM projects WHERE id = ${id}`; }
  },

  experience: {
    async create(b){
      const { rows } = await sql`SELECT COALESCE(MAX(sort), -1) + 1 AS s FROM experience`;
      const ins = await sql`INSERT INTO experience (date_label, role, org, description, areas, sort)
                            VALUES (${b.date}, ${b.role}, ${b.org || ''}, ${b.desc || ''},
                                    ${J(b.areas)}::jsonb, ${rows[0].s}) RETURNING id`;
      return { id: ins.rows[0].id };
    },
    async update(id, b){
      await sql`UPDATE experience SET date_label = ${b.date}, role = ${b.role}, org = ${b.org || ''},
                description = ${b.desc || ''}, areas = ${J(b.areas)}::jsonb WHERE id = ${id}`;
    },
    async remove(id){ await sql`DELETE FROM experience WHERE id = ${id}`; }
  },

  courses: {
    async create(b){
      const { rows } = await sql`SELECT COALESCE(MAX(sort), -1) + 1 AS s FROM courses`;
      const ins = await sql`INSERT INTO courses (name, org, year, status, description, areas, tags, sort)
                            VALUES (${b.name}, ${b.org || ''}, ${b.year || ''},
                                    ${b.status || 'Completed'}, ${b.desc || ''},
                                    ${J(b.areas)}::jsonb, ${J(b.tags)}::jsonb, ${rows[0].s}) RETURNING id`;
      return { id: ins.rows[0].id };
    },
    async update(id, b){
      await sql`UPDATE courses SET name = ${b.name}, org = ${b.org || ''}, year = ${b.year || ''},
                status = ${b.status || 'Completed'}, description = ${b.desc || ''},
                areas = ${J(b.areas)}::jsonb, tags = ${J(b.tags)}::jsonb WHERE id = ${id}`;
    },
    async remove(id){ await sql`DELETE FROM courses WHERE id = ${id}`; }
  }
};

const REORDERABLE = new Set(['categories', 'subcategories', 'projects', 'experience', 'courses']);

export default async function handler(req, res){
  if(!requireAuth(req, res)) return;

  // Vercel's build for api/admin/[...path].js only ever routed a single path
  // segment through to this function — anything with a second segment (e.g.
  // /api/admin/subcategories/12) came back as a platform-level 404 before the
  // handler ever ran. Resource and id are passed as query params instead,
  // which uses a plain non-dynamic route and sidesteps that entirely.
  const resource = req.query.resource;
  const id = req.query.id;
  const action = req.query.action;

  try{
    await init();

    // everything, always fresh — the admin must never read a cached page
    if(req.method === 'GET' && resource === 'all'){
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(await readAll());
    }

    // POST /api/admin?resource=:resource&action=reorder  { ids: [...] }
    if(req.method === 'POST' && action === 'reorder' && REORDERABLE.has(resource)){
      const ids = arr(req.body?.ids);
      for(let i = 0; i < ids.length; i++){
        await sql.query(`UPDATE ${resource} SET sort = $1 WHERE id = $2`, [i, ids[i]]);
      }
      return res.status(200).json({ ok: true });
    }

    const r = RESOURCES[resource];
    if(!r) return res.status(404).json({ error: 'Unknown resource' });

    if(req.method === 'POST')   return res.status(201).json(await r.create(req.body || {}) || {});
    if(req.method === 'PUT')    { await r.update(id, req.body || {}); return res.status(200).json({ ok: true }); }
    if(req.method === 'DELETE') { await r.remove(id);                 return res.status(200).json({ ok: true }); }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  }catch(err){
    console.error('admin:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
}
