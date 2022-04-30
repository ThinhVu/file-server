FROM node:12-alpine

WORKDIR /app

COPY package* ./

RUN npm ci

COPY ./src ./src

ENV API_PORT=4001

ENV NODE_ENV=production

EXPOSE 4001

ENTRYPOINT ["node", "src/index.js"]
