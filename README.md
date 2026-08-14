# Orion

**A website builder that gives you the files.**

Most website builders rent you a page. You design it inside their editor, it lives on their
servers, and the day you stop paying it disappears. Orion is the opposite: you pick a template,
edit it in the browser, and download a folder of ordinary HTML, CSS and JavaScript that is yours
to keep. Put it on any host — several are free forever — and it will still be running long after
you have forgotten this app exists.

```
Browse 108 templates  →  preview the real site  →  edit by clicking the page
        →  autosaves as you work  →  download a ZIP  →  host it anywhere
```

There is no build step, no framework and no runtime dependency on Orion in what you download.
Orion deliberately does not host anything: the in-app [hosting guide](src/app/(marketing)/guides/deploy/page.tsx)
walks users through four free hosts instead.

---

## Contents

- [How it works](#how-it-works) · [Quick start](#quick-start) · [Environment](#environment)
- [Deploying](#deploying) · [Optional integrations](#optional-integrations)
- [Plans](#plans) · [Templates](#templates) · [Security](#security)
- [Scripts](#scripts) · [Structure](#structure)

---

## How it works

### Templates are just folders

```
templates/nova-ai-platform/
├── index.html   about.html   contact.html
├── style.css    script.js    thumbnail.svg
└── template.json      ← name, category, tags, tier, license
```

### Anything becomes editable

Two addressing schemes, so hand-written and imported HTML both work:

1. **Authored keys** — `<h1 data-editable="hero.title">` stays stable across template updates.
2. **Automatic ordinals** — anything else gets a key from a deterministic walk of the document
   (`e17`), so third-party templates are editable without touching their markup.

`src/lib/templates/analyze.ts` turns that into the schema the editor's sidebar renders.

### The editor stores values, never HTML

```jsonc
{
  "index.html": {
    "hero.title": { "text": "Ship faster" },
    "e42":        { "hidden": true },
    "e77":        { "style": { "color": "#47a3ff" } }
  }
}
```

Generating a site replays that map onto the pristine template files. The original is never
mutated, every edit is individually resettable, and the same code path produces the preview and
the ZIP — so they cannot drift apart.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # DATABASE_URL and AUTH_SECRET at minimum
npm run check:env              # verifies the file and the database connection
npm run db:push                # create tables
npm run templates:generate     # write the 108 bundled templates to /templates
npm run templates:index        # compile them into src/generated
npm run db:seed                # categories, tags, template catalogue
npm run dev
```

The marketplace renders from the compiled bundle even with no database, so a fresh clone shows the
full catalogue immediately. Anything that writes — accounts, projects, billing — needs Postgres.

For the first admin, set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before seeding, or list the
address in `ADMIN_EMAILS` and sign up normally.

---

## Environment

Only two are required. Everything else switches a feature on; when unset, that feature explains
itself in the UI instead of erroring.

| Variable | Required | Enables |
| --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | yes | Everything that persists |
| `AUTH_SECRET` | yes | Sessions — `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | prod | Canonical origin for OG tags, sitemap, emails |
| `AUTH_GOOGLE_ID` / `_SECRET` | no | Sign in with Google |
| `AUTH_GITHUB_ID` / `_SECRET` | no | Sign in with GitHub |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Sign-up codes and password resets |
| `BLOB_READ_WRITE_TOKEN` | no | Image uploads |
| `STRIPE_*` | no | The Pro plan |

See [`.env.example`](.env.example) for the annotated list.

---

## Deploying

1. Create a Postgres database (Neon, Supabase and Vercel Postgres all work). `DATABASE_URL` is the
   pooled string, `DIRECT_URL` the direct one.
2. Import the repo into Vercel. `vercel.json` already sets the build command — leave it alone.
3. Add the environment variables, then deploy.
4. Set `NEXT_PUBLIC_APP_URL` to the URL Vercel gives you and redeploy.
5. Run `db:push` and `db:seed` once against production, unless it is the same database you
   developed on.

Long-running routes declare `maxDuration = 60`, the ceiling on Vercel's Hobby plan.

`next build` and `next dev` share `.next`, so building while the dev server runs corrupts it:

```bash
NEXT_DIST_DIR=.next-build npx next build
```

---

## Optional integrations

**Google / GitHub sign-in.** Create an OAuth client, set the callback to
`https://<your-domain>/api/auth/callback/google` (or `/github`), and set the two variables. The
button appears on its own. OAuth accounts skip the email code — the provider has already proven
the address.

**Email.** Resend over HTTP, no SDK. The shared `onboarding@resend.dev` sender only delivers to
the address that owns the Resend account, so verify a domain before real sign-ups.

**Images.** Add a Vercel Blob store and the token is injected automatically. Uploads are working
files, not storage: they are bundled into the ZIP on download and then released. `npm run
storage:gc` sweeps anything left unreferenced.

**Stripe.** Set the three `STRIPE_*` variables and register a webhook at `/api/stripe/webhook` for
`checkout.session.completed`, `customer.subscription.*` and `invoice.*`. The webhook is the
only thing that grants Pro. Until it is configured the whole plan reads "Coming soon" rather than
offering a checkout that cannot work.

---

## Plans

| | Free | Pro — $20/mo | Custom |
| --- | --- | --- | --- |
| Projects | 5 | 50 | by arrangement |
| Downloads | 5 per 30 days | 50 per 7 days | by arrangement |
| Templates | free only | + the 6 animated ones | all |
| Version history | 3 | 50 | 50 |
| Image upload size | 5 MB | 25 MB | — |
| Hosting the result | free, your own host | same | same |

Limits live in `src/lib/plans.ts` and are enforced **server-side at the point of action**. Download
allowances roll on a window stored per user; the counter is claimed with a single conditional
`UPDATE`, so two simultaneous requests cannot both pass, and a failed build releases the claim.
Hiding a button is presentation, never the control.

Custom is presentational only — there is no `CUSTOM` value in the `Plan` enum, and enquiries go to
`NEXT_PUBLIC_CONTACT_EMAIL`.

---

## Templates

108 ship with the app across 24 categories. All are original work, MIT licensed.

Six of them are **animated**: an aurora hero, headline words that stagger in, scroll reveals,
counters that roll up, pointer-tracked cards and a looping logo strip — all plain CSS and vanilla
JavaScript, because an exported site has to run from a folder with nothing installed. Everything
degrades to a static, readable page under `prefers-reduced-motion`.

Those six are the only Pro-gated templates out of the box. Admins can mark any template Pro from
`/admin/templates`, individually or in bulk; the gate is enforced in `createProjectFromTemplate`,
so posting a Pro template id straight at the API returns 402 rather than a project.

To edit or add templates, change `scripts/templates/catalog*.ts`, then:

```bash
npm run templates:generate && npm run templates:index && npm run db:seed
```

`npm run templates:import -- --repo owner/name` pulls templates from GitHub. It refuses any
repository whose license does not clearly permit redistribution, normalises every path, drops
executable file types, and records the original license and attribution. **A public repository is
not the same as a permissive license.**

---

## Security

Template code is untrusted. Every preview is served with
`Content-Security-Policy: sandbox allow-scripts allow-popups allow-forms allow-modals` — note the
missing `allow-same-origin`. The document gets an opaque origin, so template JavaScript runs but
cannot read cookies, `localStorage`, the parent DOM or any API. The editor talks to it by
`postMessage` only.

| Risk | Mitigation |
| --- | --- |
| Path traversal / zip slip | `src/lib/security/paths.ts` rejects `..`, absolute paths, drive letters, NUL bytes, over-deep paths |
| Malicious uploads | Magic-number sniffing; the client's MIME and extension are ignored. SVGs with `<script>`, `javascript:` or event handlers are refused |
| Zip bombs | Entry count, per-file size, total size and compression-ratio limits |
| XSS via the editor | Text escaped, rich text allow-listed, URLs reject `javascript:`/`data:`, CSS property allow-listed |
| Webhook spoofing | Stripe signatures verified before parsing; event ids recorded for idempotency |
| Authorization bypass | Every protected page and API re-checks the session server-side; middleware only avoids a wasted render |
| Credential stuffing | Rate limited per account *and* per source address, with equal time spent on unknown accounts so timing reveals nothing |
| Account enumeration | Sign-in reasons stay generic until a correct password has been supplied |
| Open redirect | `?next=` constrained to same-site paths by `safeNextPath` |
| Quota bypass by racing | Conditional `UPDATE` claims the allowance atomically |
| Clickjacking | `frame-ancestors 'none'` plus `X-Frame-Options` |

Rate limiting is Postgres-backed rather than Redis, so a fresh deployment needs no extra service.
`npm run verify:security` runs 54 adversarial checks against these primitives with no database or
network.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `lint` | The usual |
| `npm run check:env` | Reports what is missing and tests the database connection |
| `npm run db:push` / `db:seed` / `db:studio` | Schema, catalogue, GUI |
| `npm run templates:generate` / `:index` / `:import` | Write, compile, import templates |
| `npm run storage:gc` | Delete images nothing points at (`-- --dry-run` to preview) |
| `npm run admin:promote` / `admin:list` | Grant admin, inspect accounts |
| `npm run verify:security` | 54 adversarial checks, no database needed |
| `npm run verify:pipeline` | analyze → patch → generate → zip, end to end |
| `npm run verify:ratelimit` | Proves the limiter refuses at the configured threshold |

The `db:*` scripts run through `scripts/with-env.mjs` because the Prisma CLI does not read
`.env.local` on its own.

---

## Structure

```
src/
├── app/           (marketing) (auth) (app) admin editor api
├── components/    ui marketing templates editor billing app admin
├── lib/
│   ├── auth/      edge-safe config, providers, guards
│   ├── templates/ analyze, render, generate, serve, import
│   ├── projects/  business logic
│   ├── guides/    hosting-guide content
│   ├── security/  paths, sanitisers, rate limiting, redirects
│   └── plans.ts   limits and quota checks
└── middleware.ts  security headers + cheap auth redirect

prisma/schema.prisma   22 models
scripts/               generation, seeding, import, verification
templates/             the 108 bundled templates (generated)
```

Business logic lives in `src/lib`, not in components or route handlers. Route handlers parse,
authorise, delegate and serialise.

---

## License

Application code and bundled templates: MIT. Imported templates keep their own license, author and
attribution, stored per template and shown on its page.
