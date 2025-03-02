FROM node:22-alpine

WORKDIR /app

COPY . /app

RUN npm install pnpm -g

RUN pnpm i

RUN pnpm build