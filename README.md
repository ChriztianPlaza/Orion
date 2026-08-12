# Orion

A production-ready website builder SaaS: a template marketplace, a visual editor, a static site
generator and a deployment pipeline in one Next.js application.

```
Browse a template  →  preview it live  →  make it yours  →  edit content and images
        →  save automatically  →  download real HTML/CSS/JS   or   deploy to a live URL
```

The output is always plain static files. Nothing a user downloads depends on Orion to run.

---

## Contents

- [How it works](#how-it-works)
- [Stack](#stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Deploying to Vercel](#deploying-to-vercel)
- [Configuring Stripe](#configuring-stripe)
- [Configuring Cloudflare Pages](#configuring-cloudflare-pages)
- [Sign in with Google](#sign-in-with-google)
- [Templates](#templates)
- [Importing templates from GitHub](#importing-templates-from-github)
- [Plans and limits](#plans-and-limits)
- [Security model](#security-model)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Production checklist](#production-checklist)

---

## How it works

### The template format

A template is a folder of ordinary static files plus a small manifest:

```
templates/nova-ai-platform/
├── index.html
├── about.html
├── contact.html
├── style.css
├── script.js
├── thumbnail.svg
└── template.json
```

```json
{
  "name": "Nova — AI Platform",
  "slug": "nova-ai-platform",
  "category": "saas",
  "tags": ["ai", "dark", "startup"],
  "entryFile": "index.html",
  "pages": ["index.html", "about.html", "contact.html"],
  "license": "MIT",
  "author": "Orion",
  "attribution": null
}
```

### Making content editable

The editor addresses elements in two ways, so **any** HTML works — hand-authored or imported.

1. **Authored keys.** Templates can opt in explicitly, which keeps addresses stable across template
   updates:

   ```html
   <h1 data-editable="hero.title">Build something amazing</h1>
   <img data-editable="hero.image" src="assets/hero.jpg" alt="Hero" />
   <a data-editable="hero.button" href="/contact">Get started</a>
   ```

2. **Automatic ordinals.** Anything without a key gets one from a deterministic depth-first walk of
   the document (`e17`). Imported third-party templates become fully editable without touching their
   markup.

`src/lib/templates/analyze.ts` produces the schema the editor's sidebar renders from.

### The editor state

The editor never stores HTML. It stores a **content map** of addressable values:

```jsonc
{
  "index.html": {
    "hero.title": { "text": "Ship faster" },
    "hero.image": { "src": "https://…/photo.jpg", "alt": "Our team" },
    "e42":         { "hidden": true },
    "e77":         { "style": { "color": "#2997ff", "font-size": "48px" } }
  }
}
```

Plus a `theme` (CSS variable overrides, fonts, custom CSS) and `meta` (title, description, favicon,
share image).

Generating a site re-applies that map onto the pristine template files
(`src/lib/templates/render.ts`), so:

- the original template is never mutated,
- every edit is individually resettable,
- and the same code path produces the preview, the ZIP and the deployment — they cannot drift apart.

---

## Stack

| Concern         | Choice                                    | Why |
| --------------- | ----------------------------------------- | --- |
| Framework       | Next.js 15 (App Router) + React 19 + TS   | First-class on Vercel; server actions and route handlers where each fits |
| Styling         | Tailwind CSS v4                           | Design tokens live in CSS, no config file to drift |
| Database        | PostgreSQL + Prisma                       | Relational data with real foreign keys and indexes |
| Auth            | Auth.js v5 (NextAuth)                     | Credentials + GitHub + Google, JWT sessions, edge-safe split config |
| Payments        | Stripe Subscriptions                      | Checkout, billing portal, webhooks as the source of truth |
| Object storage  | Vercel Blob                               | No bucket, IAM or region to configure |
| Deployment      | Cloudflare Pages Direct Upload            | Real static hosting, custom project names, instant rollout |
| Email           | Resend (HTTP, optional)                   | Password reset delivery without an SDK in the bundle |

Nothing requires a persistent local filesystem or a long-running process, which is what makes the
whole thing deployable to Vercel unchanged.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in DATABASE_URL and AUTH_SECRET at minimum
npm run check:env              # confirm .env.local is filled in and the database is reachable
npm run db:push                # create the schema
npm run templates:generate     # write the 102 bundled templates to /templates
npm run templates:index        # compile them into src/generated
npm run db:seed                # categories, tags and the template catalogue
npm run dev
```

Open http://localhost:3000.

To create the first administrator, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before seeding,
or list the address in `ADMIN_EMAILS` and sign up normally.

> The marketplace renders from the compiled bundle even with no database configured, so a fresh
> clone shows a full catalogue immediately. Anything that writes — accounts, projects, billing —
> needs Postgres.

---

## Environment variables

See [`.env.example`](.env.example) for the annotated list. Only two are required:

| Variable       | Required | Enables |
| -------------- | -------- | ------- |
| `DATABASE_URL` | yes      | Everything that persists |
| `AUTH_SECRET`  | yes      | Sessions (`openssl rand -base64 32`) |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | no | The Pro plan |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | no | One-click deployment |
| `BLOB_READ_WRITE_TOKEN` | no | Image uploads |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Password reset emails |
| `AUTH_GITHUB_*`, `AUTH_GOOGLE_*` | no | Social sign-in |

Every optional integration degrades honestly: the feature explains that it needs configuration
instead of failing with a stack trace.

---

## Deploying to Vercel

1. **Create a Postgres database.** Neon, Supabase and Vercel Postgres all work. Set `DATABASE_URL`
   to the pooled connection string and `DIRECT_URL` to the direct one.
2. **Import the repository** into Vercel. The framework preset is Next.js; the build command in
   `vercel.json` already runs `prisma generate`, compiles the template index and builds.
3. **Add the environment variables** from `.env.example` to the project.
4. **Add a Blob store** (Storage → Blob) if you want image uploads. Vercel injects
   `BLOB_READ_WRITE_TOKEN` automatically.
5. **Deploy**, then run the schema push and seed once against production:

   ```bash
   DATABASE_URL="…" DIRECT_URL="…" npm run db:push
   DATABASE_URL="…" DIRECT_URL="…" npm run db:seed
   ```

6. **Register the Stripe webhook** (below) and set `NEXT_PUBLIC_APP_URL` to the production origin.

Long-running routes declare `maxDuration = 60`, which is the ceiling on Vercel's Hobby plan —
asking for more there fails the deployment. On Pro you can raise the deploy and template-upload
routes to 300.

`next build` and `next dev` share `.next`, so building while a dev server is running corrupts it.
Build into a separate directory instead:

```bash
NEXT_DIST_DIR=.next-build npx next build
```

---

## Configuring Stripe

1. Create a **recurring product** at $20/month and copy its price id into `STRIPE_PRICE_ID`.
2. Add a webhook endpoint pointing at `https://your-domain/api/stripe/webhook`, subscribed to:

   ```
   checkout.session.completed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.paid
   invoice.payment_failed
   charge.refunded
   ```

3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

The webhook is the **only** writer of subscription state and revenue. Signatures are verified before
the body is read, and every event id is recorded so a replay cannot double-count money. The frontend
never reports a payment as successful on its own — after checkout it polls the session until the
webhook has landed.

Test locally with:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Configuring Cloudflare Pages

1. Create an API token with the **Cloudflare Pages: Edit** permission.
2. Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Deployment implements the same direct-upload flow wrangler uses:

```
ensure the Pages project exists
        ↓
mint a scoped upload token
        ↓
ask which content hashes are missing  (blake3 of base64 + extension, 32 hex chars)
        ↓
upload only those assets
        ↓
create the deployment from a path → hash manifest
```

The token is read only on the server, is never included in any response, and the browser only ever
talks to `/api/projects/[id]/deploy`.

Project names are validated against `^[a-z0-9][a-z0-9-]{1,56}[a-z0-9]$`, checked for reserved words,
checked for collisions inside Orion, and then checked against Cloudflare before anything is
uploaded.

---

## Sign in with Google

Optional — email and password works without it. The provider only appears on the
sign-in page once both variables are set.

1. [console.cloud.google.com](https://console.cloud.google.com) → create or pick a project
2. **APIs & Services → OAuth consent screen** → External → fill in app name, support email and
   developer email → add your domain under Authorised domains
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Web application
4. **Authorised redirect URIs** — add one per environment, exactly:

   ```
   http://localhost:3000/api/auth/callback/google
   https://your-domain.vercel.app/api/auth/callback/google
   ```

5. Copy the client ID and secret into the environment:

   ```
   AUTH_GOOGLE_ID     = ....apps.googleusercontent.com
   AUTH_GOOGLE_SECRET = ...
   ```

6. Redeploy. A "Continue with Google" button appears on `/login` and `/register`.

GitHub works the same way — `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`, with the callback URL
`https://your-domain/api/auth/callback/github`.

**On account linking.** Both providers run with `allowDangerousEmailAccountLinking`, so signing in
with Google attaches to an existing account that has the same address rather than failing with
`OAuthAccountNotLinked`. That is only safe while the provider has verified the address, so the
`signIn` callback refuses any Google account whose `email_verified` is false. Do not add a provider
that does not verify email without removing that flag.

---

## Templates

102 templates ship with the app, across 23 categories — SaaS, portfolio, agency, restaurant,
e-commerce, blog, healthcare, education, travel, fitness, gaming and more. They are generated from a
composable section library so they genuinely differ rather than being one layout recoloured:

- `scripts/templates/themes.ts` — 15 complete visual identities (palette, type pairing, radius,
  texture, button shape)
- `scripts/templates/sections.ts` — navigation, hero, feature, pricing, menu, gallery, team, FAQ,
  contact and footer variants
- `scripts/templates/catalog.ts` and `catalog-extra.ts` — the catalogue: which theme, which sections, and its own copy

Regenerate after editing any of those:

```bash
npm run templates:generate && npm run templates:index && npm run db:seed
```

All bundled templates are original work released under the MIT license.

### Where template files live

| `storage`  | Source | Used by |
| ---------- | ------ | ------- |
| `bundled`  | Compiled into `src/generated/templates.json` at build time | The shipped catalogue |
| `db`       | `TemplateFile` rows, binaries in Blob | Admin ZIP uploads and GitHub imports |
| `blob`     | A manifest in object storage | Large imported libraries |

Compiling the bundled set into the build output is deliberate: Vercel's serverless functions do not
ship the repository working tree, and `public/` lives on the CDN rather than in the function, so
reading templates from disk at runtime would work locally and 404 in production.

---

## Importing templates from GitHub

```bash
npm run templates:import -- --repo owner/name --dry-run
npm run templates:import -- --repo owner/name --path templates --limit 50
```

The importer:

1. reads the repository's license and **refuses anything that does not clearly permit
   redistribution** (MIT, Apache-2.0, BSD, ISC, Unlicense, CC0, 0BSD, MPL-2.0, CC-BY-4.0),
2. downloads the zipball once and treats every folder containing an `index.html` as a template,
3. normalises every path, drops executable and server-side file types, and verifies that binary
   assets really are the media their extension claims,
4. guesses a category and tags from the folder name and page content,
5. records `license`, `author`, `source` and any required `attribution` — which is then shown on the
   template page and preserved as a comment in every export and deployment.

If you have written permission for a repository whose license is not on the list, pass
`--allow-license <SPDX-ID>`; the override is recorded on every template it creates.

**Do not import templates you do not have the right to redistribute.** A public repository is not
the same as a permissive license.

---

## Managing template access

Every template is either **Free** (anyone) or **Pro only** (subscribers). Set it from
`/admin/templates`:

- the **Access** dropdown on any row changes one template,
- tick the checkboxes and use **Set Pro only** / **Set Free** to change up to 500 at once,
- filter by tier, status, category or name to line up the selection first.

The gate is enforced server-side in `createProjectFromTemplate` — a Free user who posts a Pro
template id straight at the API gets a 402 and the upgrade dialog, not a project. Bulk changes are
recorded in the admin activity log.

---

## Plans and limits

| | Free | Pro — $20/month |
| --- | --- | --- |
| Website projects | 1 | Unlimited |
| Marketplace, editor, live preview | ✓ | ✓ |
| Downloads | 1 total | Unlimited |
| Version history | 3 | 50 |
| Cloudflare deployment | — | ✓ |
| Custom deployment name, redeploy, logs | — | ✓ |
| Premium templates | — | ✓ |

Limits live in `src/lib/plans.ts` and are enforced **server-side** at the point of action. The
download counter is incremented in the same transaction that records the download, and only after
the archive has been built successfully — a failed export never burns a free user's single
allowance. Hiding a button is presentation, never the control.

---

## Security model

**Template code is untrusted.** Every preview is served with
`Content-Security-Policy: sandbox allow-scripts allow-popups allow-forms allow-modals` — note the
absence of `allow-same-origin`. The document gets an opaque origin, so template JavaScript runs
normally but cannot read Orion cookies, `localStorage`, the parent DOM or any API. The editor
bridge communicates by `postMessage` only.

Other measures:

| Risk | Mitigation |
| --- | --- |
| Path traversal / zip slip | `src/lib/security/paths.ts` normalises every untrusted path; `..`, absolute paths, drive letters, NUL bytes and over-deep paths are rejected |
| Malicious uploads | Magic-number sniffing decides the type; the client's MIME and extension are ignored. SVGs carrying `<script>`, `javascript:` or event handlers are refused |
| Zip bombs | Entry count, per-file size, total uncompressed size and compression-ratio limits |
| Arbitrary file execution | `.php`, `.jsp`, `.asp`, `.exe`, `.sh`, `.htaccess` and friends are dropped at extraction; nothing extracted is ever executed |
| XSS via the editor | Text is escaped, rich text is allow-listed, URLs reject `javascript:`/`data:`, CSS is property allow-listed |
| Webhook spoofing | Stripe signatures verified before parsing; event ids recorded for idempotency |
| Authorization bypass | Every protected page and API re-checks the session server-side. Middleware only avoids a wasted render |
| Credential exposure | Cloudflare and Stripe secrets are read exclusively in server modules; `src/lib/env.ts` is never imported by a client component |
| Credential stuffing | The credentials provider is rate limited twice — per account and per source address — and spends equal time on unknown accounts so timing does not reveal which emails are registered |
| Open redirect | `?next=` is constrained to same-site paths by `safeNextPath`, so a crafted login link cannot bounce a freshly authenticated user off-site |
| Quota bypass by racing | Download and project limits are claimed with a single conditional `UPDATE`, so two simultaneous requests cannot both pass the check. A failed build releases the claim |
| Clickjacking | `frame-ancestors 'none'` plus `X-Frame-Options` |
| API abuse | Durable sliding-window rate limiting across auth, reads, writes, uploads, exports, deploys, billing sessions, favourites, view tracking, deployment-name lookups and admin actions |
| Secure headers | HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` from middleware |

Rate limiting is backed by Postgres rather than Redis so a fresh deployment needs no extra service.
Swapping in Upstash means reimplementing `consumeRateLimit` alone.

---

## Project structure

```
src/
├── app/
│   ├── (marketing)/          landing, marketplace, template detail, pricing
│   ├── (auth)/               login, register, forgot/reset password
│   ├── (app)/                dashboard, account
│   ├── admin/                overview, templates, revenue, users, activity
│   ├── editor/[id]/          the visual editor
│   └── api/
│       ├── auth/             registration, password reset, Auth.js handlers
│       ├── projects/         CRUD, schema, versions, duplicate, export, deploy
│       ├── templates/        views, favourites
│       ├── deployments/      status, delete, name availability
│       ├── preview/          sandboxed template rendering
│       ├── render/           sandboxed project rendering (+ editor bridge)
│       ├── uploads/          image uploads
│       ├── stripe/           checkout, portal, webhook
│       └── admin/            template management
├── components/
│   ├── ui/                   button, card, badge, input, dialog, toast
│   ├── marketing/            header, footer, showcase
│   ├── templates/            cards, filters, live preview, favourites
│   ├── editor/               shell, sidebar, inspector, image picker, deploy dialog
│   ├── billing/              pricing, upgrade dialog, portal button
│   ├── app/                  app header, project card
│   └── admin/                template manager, charts
├── lib/
│   ├── auth/                 config (edge-safe), providers, guards
│   ├── db.ts                 Prisma singleton
│   ├── templates/            analyze, render, generate, serve, store, import-zip, queries
│   ├── projects/             project service (business logic)
│   ├── stripe/               client and helpers
│   ├── cloudflare/           Pages direct upload
│   ├── storage/              Blob wrapper and image sniffing
│   ├── security/             paths, sanitisers, rate limiting
│   ├── admin/                analytics and audit logging
│   └── plans.ts              plan limits and quota checks
├── generated/                compiled template bundle (build artefact)
└── middleware.ts             security headers + cheap auth redirect

prisma/schema.prisma          17 models with indexes and foreign keys
scripts/                      template generation, indexing, seeding, GitHub import
templates/                    the 102 bundled templates (generated)
```

Business logic lives in `src/lib`, not in components or route handlers. Route handlers parse,
authorise, delegate and serialise.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` → compile template index → `next build` |
| `npm run lint` | ESLint |
| `npm run check:env` | Reports what is missing from .env.local and tests the database connection |
| `npm run db:push` | Create the tables. Runs through `scripts/with-env.mjs` because the Prisma CLI does not read `.env.local` on its own |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Categories, tags and the bundled template catalogue |
| `npm run templates:generate` | Write `/templates` from the section library |
| `npm run templates:index` | Compile `/templates` into `src/generated` |
| `npm run templates:import` | Import templates from a GitHub repository |
| `NEXT_DIST_DIR=.next-build npx next build` | Build without disturbing a running `npm run dev` (they otherwise share `.next`) |
| `npm run verify:security` | 61 adversarial checks against the sanitisers, path handling, redirect guard and upload sniffing. No database needed |
| `npm run verify:ratelimit` | Proves the rate limiter refuses traffic at the configured limit. Needs DATABASE_URL |
| `npm run verify:pipeline` | End-to-end check of analyze → patch → generate → zip, with no database or network. Covers the sanitisers, editor tagging and ordinal stability |

---

## Production checklist

- [ ] `DATABASE_URL` and `DIRECT_URL` point at a production Postgres instance
- [ ] `AUTH_SECRET` is a fresh 32-byte random value
- [ ] `NEXT_PUBLIC_APP_URL` matches the production origin
- [ ] `npm run db:push` and `npm run db:seed` have run against production
- [ ] Stripe webhook registered and `STRIPE_WEBHOOK_SECRET` set; a test payment appears in
      `/admin/revenue`
- [ ] Cloudflare token has Pages: Edit and a test deployment returns a working URL
- [ ] Blob store attached; an image upload succeeds in the editor
- [ ] The first admin exists and `/admin` is unreachable for normal accounts
- [ ] `ADMIN_EMAILS` removed once the first administrator is created
- [ ] A template preview renders and its JavaScript cannot reach `document.cookie` from the frame
- [ ] A downloaded ZIP opens correctly from `file://`

---

## License

Application code: MIT. Bundled templates: MIT. Imported templates retain their own license,
attribution and author, which are stored per template and displayed on the template page.
