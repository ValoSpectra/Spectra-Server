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
EXPOSE 5102

RUN openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
      -nodes -keyout /app/keys/server.key -out /app/keys/server.crt -subj "/CN=spectra"

ENV INSECURE=false
ENV SERVER_KEY=/app/keys/server.key
ENV SERVER_CERT=/app/keys/server.crt

CMD ["yarn", "start", "--host", "0.0.0.0"]
