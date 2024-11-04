# Guide for Local Development

## Prerequisites

1. Install [Node.js](https://nodejs.org/en/docs/)
2. Install [Yarn](https://yarnpkg.com/lang/en/)

## Getting Started

1. Clone the repository

   ```bash
   git clone https://github.com/ValoSpectra/Spectra-Server.git
   ```

2. Install dependencies

   ```bash
   cd Spectra-Server
   yarn install
   ```

3. Create self signed certificate (optional)

   ```bash
    openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
      -nodes -keyout keys/server.key -out keys/server.crt -subj "/CN=spectra" \
   ```

4. Set up environment variables

   ```bash
   cp .env.example .env
   ```

   Change the values in the `.env` file to match your needs. If you have used the command above, the default values should be fine. If you have not created a self signed certificate, set `INSECURE=true` in the `.env` file.

5. Start the server

   ```bash
   yarn start
   ```
