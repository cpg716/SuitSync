FROM node:20-alpine
WORKDIR /app

# 1. Copy package files and Prisma schema
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# 2. Install dependencies
RUN npm install -g pnpm \
 && pnpm install --frozen-lockfile

# 3. Copy the rest of your source
COPY . ./

# 4. Generate tsoa routes + spec
RUN pnpm run tsoa:routes \
 && pnpm run tsoa:spec

# 5. Build TypeScript
RUN pnpm run build

RUN apk add --no-cache curl

EXPOSE 3000
CMD ["node", "dist/index.js"]