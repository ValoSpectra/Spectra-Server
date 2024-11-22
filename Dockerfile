FROM node:22-alpine3.19

WORKDIR /app

COPY yarn.lock package.json ./

RUN apk upgrade --update-cache --available && \
    apk add openssl && \
    rm -rf /var/cache/apk/*

RUN corepack enable
RUN yarn install

COPY . .

EXPOSE 5100
EXPOSE 5101
EXPOSE 5200

ENV INSECURE=false
ENV SERVER_KEY=/app/keys/server.key
ENV SERVER_CERT=/app/keys/server.crt

RUN mkdir -p /app/keys

RUN yarn install

ENTRYPOINT [ "/app/entrypoint.sh" ]
