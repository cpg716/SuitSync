FROM node:20-alpine
WORKDIR /app

# 1. Copy package files and Prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma

# 2. Install dependencies
RUN npm ci

# 3. Copy the rest of your source
COPY . ./

# 4. Generate tsoa routes + spec
RUN npm run tsoa:routes \
 && npm run tsoa:spec

# 5. Build TypeScript
RUN npm run build

RUN apk add --no-cache curl

EXPOSE 3000
CMD ["node", "dist/index.js"]