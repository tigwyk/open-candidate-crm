FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bunx prisma generate
RUN bun run build

RUN chown -R bun:bun /app
USER bun

ENV NODE_ENV=production
EXPOSE 3000

# Apply any pending Postgres migrations before the server starts serving traffic.
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start"]
