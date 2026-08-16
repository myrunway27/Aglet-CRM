# Deploying The True Review

The app is a single Node server with a SQLite database file and an uploads folder. Any host that runs a Docker container with a persistent volume works: Fly.io, Railway, Render, or a plain VPS.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:/data/prod.db` (default in the Dockerfile) |
| `APP_URL` | recommended | Public URL, used in notification emails (e.g. `https://truereview.example`) |
| `SMTP_HOST`, `SMTP_PORT` | for real email | Your email provider's SMTP server |
| `SMTP_USER`, `SMTP_PASS` | for real email | SMTP credentials |
| `SMTP_FROM` | for real email | e.g. `The True Review <hello@truereview.example>` |
| `SMTP_SECURE` | optional | `true` for implicit TLS (port 465) |

Without SMTP variables, emails (verification codes, owner notifications) are **not sent** — they're only recorded in the admin-visible outbox at `/admin/outbox`. That's fine for testing, but sign-ups can't self-verify, so set SMTP before real users arrive. Cheap/free options: Resend, Postmark, Brevo, or Amazon SES — each gives you SMTP credentials in minutes.

## Fly.io (example)

```bash
fly launch --no-deploy          # accept the detected Dockerfile
fly volumes create data --size 1
fly volumes create uploads --size 1
```

Add to `fly.toml`:

```toml
[mounts]
  source = "data"
  destination = "/data"

[[mounts]]
  source = "uploads"
  destination = "/app/public/uploads"
```

Then:

```bash
fly secrets set SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... SMTP_FROM="The True Review <hello@yourdomain>" APP_URL=https://yourapp.fly.dev
fly deploy
fly certs add yourdomain.com    # after pointing DNS at the app
```

## Any VPS

```bash
docker build -t truereview .
docker run -d -p 3000:3000 \
  -v truereview-data:/data \
  -v truereview-uploads:/app/public/uploads \
  -e SMTP_HOST=... -e SMTP_PORT=587 -e SMTP_USER=... -e SMTP_PASS=... \
  -e SMTP_FROM="The True Review <hello@yourdomain>" \
  -e APP_URL=https://yourdomain.com \
  --restart unless-stopped truereview
```

Put nginx/Caddy in front for HTTPS on your domain.

## First-run checklist

1. Deploy, then open the site — the database is created automatically on boot.
2. Create your own account, then promote it to admin directly on the server:
   ```bash
   npx prisma db execute --url "$DATABASE_URL" \
     --stdin <<< "UPDATE User SET isAdmin = 1 WHERE email = 'you@yourdomain.com';"
   ```
   (Or run the seed script and log in as the seeded admin — but **change that password immediately** or delete the seeded accounts for production.)
3. Send yourself a test verification email to confirm SMTP works.
4. You're live: moderation queue at `/admin`, email log at `/admin/outbox`.

## Scaling note

SQLite comfortably handles small-to-medium traffic on one machine. When you outgrow it, switch `prisma/schema.prisma`'s datasource to `postgresql`, set `DATABASE_URL` to a hosted Postgres (Neon, Supabase, RDS), run `prisma db push`, and deploy — no code changes needed.
