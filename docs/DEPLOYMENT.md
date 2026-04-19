# Deployment Guide

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9
- [Cloudflare account](https://dash.cloudflare.com/) with Workers and R2 enabled
- At least one R2 bucket created in the Cloudflare dashboard

## Local Development

### Install Dependencies

```bash
pnpm install
```

### Generate Cloudflare Types

```bash
pnpm cf-typegen
```

This reads `wrangler.jsonc` and generates `cloudflare-env.d.ts` with typed bindings for R2 buckets.

### Development Modes

| Command | Runtime | R2 Access | Hot Reload | Use For |
|---------|---------|-----------|------------|---------|
| `pnpm dev` | Node.js | No | Yes | UI development |
| `pnpm preview` | workerd | Yes | No | Full testing with R2 |

**`pnpm dev`** starts the Next.js dev server on `localhost:3000`. R2 bindings are not available -- API routes that access R2 will fail. Use this for fast UI iteration.

**`pnpm preview`** builds the app with `opennextjs-cloudflare` and runs it in the local Workers runtime (`workerd`) on `localhost:8787`. R2 bindings are available through local emulation. Use this to test file operations end-to-end.

### Local Environment Variables

Create `.dev.vars` in the project root (gitignored):

```
NEXTJS_ENV=development
```

## Production Deployment

### Automatic (Recommended)

Push to `main`. Cloudflare Workers Builds detects the push and runs the build command from `wrangler.jsonc`:

```
npx opennextjs-cloudflare build
```

The built Worker is deployed automatically to your configured route.

### Manual

```bash
pnpm deploy
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.

## Configuration

### wrangler.jsonc

The main configuration file for the Cloudflare Worker:

```jsonc
{
  "name": "r2-storage",
  "compatibility_date": "2026-04-12",
  "compatibility_flags": ["nodejs_compat"],
  "build": {
    "command": "npx opennextjs-cloudflare build"
  },
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "routes": [
    {
      "pattern": "r2.example.com",
      "custom_domain": true
    }
  ],
  "r2_buckets": [
    {
      "binding": "WEBSITE_ASSETS",
      "bucket_name": "my-website-assets"
    }
  ]
}
```

### Adding R2 Buckets

1. Create the bucket in the Cloudflare dashboard (or via `wrangler r2 bucket create`)
2. Add a binding in `wrangler.jsonc` under `r2_buckets`:

```jsonc
{
  "binding": "MY_NEW_BUCKET",
  "bucket_name": "my-new-bucket"
}
```

3. Regenerate types: `pnpm cf-typegen`
4. Deploy. The bucket appears in the sidebar automatically.

The binding name (e.g., `MY_NEW_BUCKET`) is what users see in the UI. The `bucket_name` is the actual R2 bucket in Cloudflare.

### Custom Domain

1. Add a CNAME record pointing your domain to `r2-storage.<your-account>.workers.dev`
2. Configure the route in `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "r2.example.com",
      "custom_domain": true
    }
  ]
}
```

### Authentication with Cloudflare Access

1. Go to [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com/)
2. Create an Access Application for your domain
3. Configure identity providers (Google, GitHub, email OTP, etc.)
4. Set access policies (who can reach the app)

The app itself has no login page or auth code. If a user can reach it, they are already authenticated.

## Build Pipeline

```
Source code (Next.js 16)
    |
    v
opennextjs-cloudflare build
    |
    v
.open-next/
  worker.js      # Worker entry point
  assets/        # Static assets (served by Workers Assets)
    |
    v
Cloudflare Workers (deployed)
    |
    v
R2 buckets (accessed via Worker bindings)
```

The `@opennextjs/cloudflare` adapter converts the Next.js output into a Cloudflare Worker. Static assets are served through Workers Assets, and API routes run as Worker handlers with access to R2 bindings.

## Limits

| Constraint | Limit | Mitigation |
|-----------|-------|------------|
| Worker request body | 100 MB | Multipart upload for files >= 95 MB |
| R2 object size | 5 TB | Multipart upload handles large files |
| Worker CPU time | 30s (paid) / 10ms (free) | Batch deletes process 1000 objects per iteration |
| Subrequest limit | 1000/request | Folder deletes paginate in batches of 1000 |

## Troubleshooting

### "No buckets found"

- Check that `wrangler.jsonc` has at least one `r2_buckets` entry
- Run `pnpm cf-typegen` to verify bindings
- The `ASSETS` binding is automatically excluded from the bucket list

### Build fails with type errors

```bash
pnpm cf-typegen  # Regenerate cloudflare-env.d.ts
```

### Preview mode can't access R2

- Ensure `wrangler.jsonc` has the correct `bucket_name` values
- Check that the buckets exist in your Cloudflare account
- Local preview uses `workerd` emulation -- create test data via the UI

### Deploy fails

- Verify you're logged in: `npx wrangler whoami`
- Check the Workers Builds log in the Cloudflare dashboard
- Ensure `compatibility_date` is recent enough for the APIs used
