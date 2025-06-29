# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . ./

# Install wait-for-it
RUN apk add --no-cache bash
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Stage 2: Run
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app /app
COPY --from=build /wait-for-it.sh /wait-for-it.sh
ENV NODE_ENV=production
EXPOSE 3000
CMD ["/wait-for-it.sh", "postgres:5432", "--", "sh", "-c", "npx prisma migrate deploy && npm run seed && npm run dev"]

FROM alpine
WORKDIR /app
COPY . .
RUN ls -lR /app 