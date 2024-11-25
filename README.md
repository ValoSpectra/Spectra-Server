# ValoSpectra - Server

Spectra is your all-in-one solution for an amazing looking Valorant Tournament Overlay, enabling all Organizers to display information like held gun, available credits etc. with just a single spectator running software.
To learn more and see a live demo, visit [valospectra.com](https://www.valospectra.com/).

It is comprised of three parts:
 - [The Spectra Client](https://github.com/ValoSpectra/Spectra-Client)
   - Running this software on a single in-game observer provides the Spectra Server with all data currently provided by Overwolf.
 - [The Spectra Server](https://github.com/ValoSpectra/Spectra-Server)
   - Ingests data from the Observer Client to reproduce the games state, allowing us to have an accurate representation of the game for further use.
 - [The Spectra Frontend](https://github.com/ValoSpectra/Spectra-Frontend)
   - Receives the game state from the Server every 100 milliseconds, presenting it in a beautiful manner for viewers to enjoy.

Further updates for new features, as well as a detailed setup guide and an easy to host docker container are in the pipeline!

# Docker Compose tutorial:
First, create a seperate folder in your working directory:
```
$ mkdir -p spectra-server/keys
$ cd spectra-server
```

Create a file named docker-compose.yml as follow:
```
---
services:
  valo-spectra-frontend:
    image: "ghcr.io/valospectra/server"
    ports:
      - "5100:5100"
      - "5101:5101"
      - "5200:5200"
    volumes:
      - ./keys:/app/keys
    environment:
      - INSECURE=true
```
Inside ```keys``` folder, add your SSL certificate and key. If your SSL is trusted, you can set ```INSECURE=false```. If you don't provide any, a self-signed one will be generated for you.

After that you can start the server by running: ```docker compose up -d```
# DISCLAIMER
Spectra-Client isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
