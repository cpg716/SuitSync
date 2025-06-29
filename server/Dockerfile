# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY ../prisma ./prisma
RUN npm install
RUN npx prisma generate
COPY . .

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "demo"] 