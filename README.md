# M. Burhan — Portfolio

A developer portfolio with a glassmorphism UI, light/dark themes, a searchable
expertise finder, and an admin panel for managing all content.

The public pages are plain HTML, CSS and JS — no framework, no build step. The
admin is backed by Vercel serverless functions, Postgres and Blob storage.

## Structure

```
portfoliosite/
├── index.html            # home page
├── expertise.html        # expertise finder + projects / experience / courses
├── admin.html            # admin panel  (also served at /admin)
├── css/
│   ├── style.css          # all site styling and theme tokens
│   └── admin.css          # admin-only styling (reuses the same tokens)
├── js/
│   ├── main.js            # scroll reveals, marquee, theme toggle, parallax
│   ├── data.js            # loads /api/content, falls back to data/seed.json
│   ├── expertise.js       # the search bar / category finder
│   ├── explore.js         # projects, experience, courses + filtering
│   └── admin.js           # admin panel logic
├── api/
│   ├── content.js         # GET  public content
│   ├── auth.js            # POST login / logout, GET session
│   ├── upload.js          # image & video uploads to Vercel Blob
│   ├── admin/[...path].js # authenticated CRUD for every content type
│   └── _lib/              # db, schema + seeding, cookie auth
├── data/seed.json        # starting content (seeds the DB, and the offline fallback)
└── assets/               # hero portrait etc.
```

## Deploying to Vercel

### 1. Push the repo

```bash
git init && git add -A && git commit -m "Portfolio with admin"
git remote add origin <your-repo-url>
git push -u origin main
```

Then in Vercel: **Add New → Project → import the repo.** No build command and no
output directory — Vercel serves the static files and picks up `/api`
automatically.

### 2. Attach a database

In the project dashboard: **Storage → Create → Postgres** (Neon-backed), then
connect it to the project. This sets `POSTGRES_URL` for you.

The tables are created on the first request, and seeded once from
`data/seed.json` — so the site is populated the moment it goes live.

### 3. Create a Blob store

**Storage → Create → Blob**, connect it to the project. This sets
`BLOB_READ_WRITE_TOKEN`. Uploads go straight from the browser to Blob storage,
so large video files are not limited by the serverless request body size.

### 4. Set two environment variables

**Settings → Environment Variables:**

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | The password you will type at `/admin` |
| `AUTH_SECRET` | A long random string used to sign the session cookie |

Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Redeploy

**Deployments → ⋯ → Redeploy** so the new variables are picked up. Then open
`https://your-site.vercel.app/admin` and sign in.

## Running it locally

The public pages work from any static server — they fall back to
`data/seed.json` when the API is not running:

```bash
python3 -m http.server 8000
```

To run the API and admin locally too, you need the Vercel CLI:

```bash
npm install
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

## Using the admin

Open `/admin` and sign in. Five tabs, each with add / edit / delete:

- **Categories** — the areas in the expertise search bar. Each has a name,
  description, tags, search keywords and one of nine animated icons.
- **Sub-categories** — the pills inside Projects (Ecommerce Store, LMS, POS …),
  grouped under a category.
- **Projects** — title, description, links, tags, categories, sub-categories,
  a client review, and **images and video**.
- **Experience** — roles shown on the Experience tab.
- **Courses** — courses shown on the Courses tab.

### Adding project media

In a project, under **Media**:

- **Upload image / video** — uploads to Blob storage; accepts jpg, png, webp,
  avif, gif, svg, mp4, webm and mov up to 200 MB. Multi-select works.
- **Add by URL** — for media already hosted elsewhere.
- **Add placeholder** — a styled stand-in until the real file exists.

Each item can be reordered with ↑ ↓ or removed with ×. Images take alt text,
videos take an optional poster image, and the first item is the one shown first
in the card's carousel.

### Two things worth knowing

- A **category's id is fixed** once created — projects, roles and courses all
  point at it. You can rename the display name freely; the id stays put.
- **Renaming a sub-category updates every project** that used it, and deleting
  one removes it from those projects. Deleting a category likewise strips that
  tag from everything referencing it, so nothing is left pointing at a record
  that no longer exists.

## Theme

The page follows the visitor's system preference and the sun/moon button
overrides it, remembered in `localStorage`. All colours are CSS custom
properties at the top of `css/style.css` — change them there to retheme both the
site and the admin.

## Notes

- Fonts (Bricolage Grotesque, Manrope, JetBrains Mono) load from Google Fonts;
  there is a system-font fallback either way.
- Animations respect `prefers-reduced-motion`.
- `/admin` is marked `noindex, nofollow` and every write endpoint requires the
  signed session cookie.
