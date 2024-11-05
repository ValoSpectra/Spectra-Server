#!/bin/sh
if [ ! -f $SERVER_KEY ] || [ ! -f $SERVER_CERT ]; then
  openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout $SERVER_KEY -out $SERVER_CERT -subj '/CN=spectra'; \
fi 
yarn start_single --host 0.0.0.0
