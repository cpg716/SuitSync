# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY .env.local .env.local
RUN npm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
RUN npm install -g npm@11.4.2
EXPOSE 3000
CMD ["npm", "run", "start"] 