FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/scripts/bootstrap-admin.mjs ./scripts/bootstrap-admin.mjs
COPY --from=builder /app/scripts/backfill-pseudonyms.mjs ./scripts/backfill-pseudonyms.mjs
COPY --from=builder /app/scripts/backfill-last-reviewed.mjs ./scripts/backfill-last-reviewed.mjs

# The database is Postgres (DATABASE_URL / DIRECT_URL) and review photos live
# in Supabase Storage (SUPABASE_URL / SUPABASE_SECRET_KEY). Nothing on this
# container's disk needs to survive a redeploy.

EXPOSE 3000
# Startup: apply any pending versioned migrations (never `db push` against
# production data), make sure the admin accounts exist, then serve.
CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/bootstrap-admin.mjs && npx next start -p ${PORT:-3000}"]
