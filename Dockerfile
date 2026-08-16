FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL="file:/data/prod.db"
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/prod.db"
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# /data holds the SQLite database; public/uploads holds review photos.
# Mount BOTH as persistent volumes or all data is lost on redeploy.
VOLUME ["/data", "/app/public/uploads"]

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p 3000"]
