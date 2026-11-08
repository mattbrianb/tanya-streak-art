# Tanya Streak Art: setup & deploy

Everything runs on **Cloudflare's free tier**, with the code on **GitHub**. The only cost is the domain.

| Piece | What it does | Free allowance |
|---|---|---|
| Cloudflare Pages | Hosts the website, redeploys when you push to GitHub | Unlimited visits and bandwidth |
| Pages Functions | The small API: paintings, sign-ups, portal login | 100,000 requests a day |
| D1 database | Paintings, subscribers, settings | 5 GB; 5 million reads a day |
| Workers KV | Painting photos | 1 GB (about 1,500 paintings); 1,000 uploads a day |

No credit card is needed for any of these. Unlike Supabase's free tier, a quiet site is never paused.

## How it fits together

```
site/
  public/            the website (plain HTML/CSS/JS, no build step)
    portal/          Tanya's portal (sign in at /portal/)
  functions/         the API (Cloudflare Pages Functions)
  lib/               shared server code
  schema.sql         database tables
  scripts/seed.mjs   loads the current Instagram paintings
  wrangler.toml      Cloudflare settings (database + photo storage IDs)
```

When Tanya adds a painting, marks one sold or someone joins the email list, it is saved to D1/KV and the site reads it live. **There is no rebuild and nothing for you to do.** You only push to GitHub when the site's design or code changes.

## One-time setup (about 20 minutes)

Run these from the `site` folder.

1. **Install the tools**
   ```bash
   npm install
   ```

2. **Log in to Cloudflare** (this opens your browser; approve it with your Cloudflare account)
   ```bash
   npx wrangler login
   ```

3. **Create the database**, then copy the `database_id` it prints into `wrangler.toml`
   ```bash
   npx wrangler d1 create tanya-art
   ```

4. **Create the photo store**, then copy the `id` it prints into `wrangler.toml` under `[[kv_namespaces]]`
   ```bash
   npx wrangler kv namespace create IMAGES
   ```

5. **Create the tables**
   ```bash
   npm run db:remote
   ```

6. **Put the code on GitHub.** Make a new **private** repo (e.g. `tanya-streak-art`) and push the contents of `site/` to it as the repo root.
   ```bash
   git init && git add . && git commit -m "Tanya Streak Art site"
   ```
   ```bash
   git remote add origin https://github.com/<you>/tanya-streak-art.git
   ```
   ```bash
   git push -u origin main
   ```

7. **Create the Pages project** in the Cloudflare dashboard:
   - Go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repo.
   - **Framework preset:** None. **Build command:** leave empty. **Build output directory:** `public`.
   - Deploy. The database and photo bindings are read from `wrangler.toml` automatically.

8. **Add the two secrets.** In the Pages project go to **Settings → Variables and Secrets** and add both as type *Secret*, for **Production**:
   - `ADMIN_PASSWORD`: Tanya's first portal password. She can change it herself later in the portal.
   - `SESSION_SECRET`: a long random string. Generate one with:
     ```bash
     node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
     ```

   Then **Deployments → ⋯ → Retry deployment** so they take effect.

9. **Load the current paintings** (uses the portal, so it needs the password from step 8)
   ```bash
   node scripts/seed.mjs https://tanya-streak-art.pages.dev "THE-PASSWORD"
   ```
   It skips any painting that already exists, so it is safe to run twice.

10. **Check it:** open `https://tanya-streak-art.pages.dev`, then sign in at `/portal/`.

## Tanya's logo

Her original logo (on a greige square) is kept in `../_src/brand/logo-original.png`. The site uses transparent versions extracted from it:

- `public/static/logo.png`: the script over a soft "TS" monogram (header, footer, portal)
- `public/static/logo-script.png`: the script only
- `public/static/logo-white.png`: a white version for photos or dark backgrounds
- `public/apple-touch-icon.png`, `public/favicon.png` and `public/static/icon-512.png`: the "TS" monogram in dusty rose on blush
- `public/static/og.jpg`: the preview image when the site is shared on WhatsApp or Facebook

## Features at a glance

- **Shop and Gallery:** sold work stays visible with a "Sold" label.
- **"View on a wall" (Wallroom):** any painting hung at true size on a lit wall.
- **In a room:** hover any painting card, or tap "In a room" on a painting page, to see it hanging at true scale in a room photo that suits its colours and size. The rooms are 13 free Unsplash photos in `public/static/rooms/` (see CREDITS.txt there), and the placement data is in `public/js/rooms.js`." Her extra photos show as thumbnails on each painting page.
- **Walk the gallery (`/walk/`):** a 3D gallery room built from her live paintings, using Three.js from a CDN.
- **Email pop-up and footer sign-up:** subscribers are listed in the portal.
- **Completed commissions (`/commissions/completed/`):** a magazine-style page of finished commissions and sold originals: each gets its own spread (painting and story, alternating sides) that fades in on scroll, and `#slug` jumps to one. Tanya adds them under **Finished commissions** in the portal; they're stored as paintings with `kind = 'commission'` and never appear in the shop, gallery or 3D walk. The "Commissions" menu becomes a dropdown once at least one is showing. Tanya's 22 earlier sold paintings were loaded in bulk from `../_src/sold/` (`sold-commissions.sql` plus `kv-bulk.json`, photos under `p0/…-mwsold1-…` keys, because `/img/` only serves `p<number>/` keys).

### Database changes
New columns come as numbered files in `migrations/`. Run each once on the live database (and locally if you develop):
```bash
npx wrangler d1 execute tanya-art --remote --file=migrations/0001_commissions.sql
```

## Domain (the one cost)

- **`.co.za`** (about R100–R150 a year): buy it from a South African registrar (e.g. Domains.co.za, Afrihost, xneelo). In Cloudflare go to **Add a site**, choose the Free plan, and change the domain's nameservers at the registrar to the two Cloudflare gives you.
- **`.com`**: buy it straight from **Cloudflare Registrar** at cost. It is set up automatically.
- Then, in the Pages project, go to **Custom domains → Set up a domain**. Add both `tanyastreakart.co.za` and `www.`. HTTPS is automatic.

## Handing over to Tanya

- Send her the portal link: `https://<domain>/portal/`, and the password.
- On her phone: open the link in Safari or Chrome, then **Share → Add to Home Screen**. It then opens like an app.
- If she forgets the password: change `ADMIN_PASSWORD` in Cloudflare, run the command below to clear the one she set herself, and redeploy:
  ```bash
  npx wrangler d1 execute tanya-art --remote --command "DELETE FROM settings WHERE key='password_hash'"
  ```

## Email list

- People join from the popup (shown once per visitor, after 15 seconds or half-way down a page) or from the footer on every page.
- Tanya can turn the popup off and change its wording in **Portal → Settings**.
- In **Portal → Subscribers** she can **Copy all emails** (paste into the BCC box in Gmail) or **Download spreadsheet** (for Mailchimp, Brevo and similar).
- Unsubscribe page: `/unsubscribe/`. Put this line at the bottom of every email she sends:
  `Don't want these? Unsubscribe at https://<domain>/unsubscribe/`
  POPIA expects an easy opt-out.

## Working on the site locally

```bash
cp .dev.vars.example .dev.vars
```
Then edit `.dev.vars` and set a password.
```bash
npm run db:local
```
```bash
npm run dev
```
The site runs at http://127.0.0.1:8788 (portal at `/portal/`). Load the sample paintings with:
```bash
node scripts/seed.mjs http://127.0.0.1:8788 "your-local-password"
```

## Backups

D1 keeps 7 days of history on the free plan; see "Time Travel" in the dashboard. For an extra copy now and then:
```bash
npx wrangler d1 export tanya-art --remote --output backup.sql
```
