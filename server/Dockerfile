# Build context is the repo root (the API imports ../src/lib/* shared with the frontend).
FROM node:24-slim
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm install --no-save tsx@4 >/dev/null
COPY server/ ./
COPY src/lib/ ../src/lib/
EXPOSE 3000
# Apply pending migrations, then start.
CMD ["sh", "-c", "npx tsx src/db/migrate.ts && npx tsx src/index.ts"]
