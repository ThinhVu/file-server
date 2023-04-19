FROM node:14-alpine
WORKDIR /app
COPY package* ./
COPY yarn.lock ./
ENV NODE_ENV=production
RUN yarn
COPY ./src ./src
ENTRYPOINT ["/bin/sh", "-c" , "yarn && node ./src/index.js"]
