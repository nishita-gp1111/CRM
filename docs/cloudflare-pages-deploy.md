# Cloudflare Pages Deployment

This CRM is a dynamic Next.js App Router application. It uses route handlers,
authentication, cookies, and Prisma-backed server logic, so do not deploy it as
a static `out` export.

## Cloudflare Pages Settings

Use these values in Cloudflare Pages:

| Setting | Value |
| --- | --- |
| Framework preset | `None` |
| Build command | `npm run pages:build` |
| Output directory | `.vercel/output/static` |
| Root directory | `/` |
| Node.js version | `20` or later |

The `pages:build` script runs:

```bash
npx @cloudflare/next-on-pages@1
```

Cloudflare Pages should deploy the generated `.vercel/output/static` directory
and its Pages Functions output. Do not set the output directory to `.next`,
`out`, or `dist`.

## Required Cloudflare Runtime Settings

Set the Pages Functions compatibility flag:

```text
nodejs_compat
```

Use the same production environment variables configured for the app, including:

```text
DATABASE_URL
SESSION_SECRET
APP_URL
APP_ENCRYPTION_KEY
APP_ENCRYPTION_KEY_VERSION
GOOGLE_CALENDAR_INTEGRATION_ENABLED
GOOGLE_CALENDAR_WEBHOOK_ENABLED
PUBLIC_SCHEDULING_ENABLED
FORM_BUILDER_V2_ENABLED
```

Cloudflare stores variables as separate name/value fields. For example:

| Name | Value |
| --- | --- |
| `APP_ENCRYPTION_KEY` | `Tdbb...` |

Do not put `APP_ENCRYPTION_KEY=` inside the value field.

## Important Note

As of the current Cloudflare documentation, Cloudflare recommends Workers with
the OpenNext adapter for full-stack SSR Next.js apps. If this Pages deployment
hits adapter/runtime limitations, migrate the deploy target to Workers using
`@opennextjs/cloudflare` rather than changing this CRM to a static export.
