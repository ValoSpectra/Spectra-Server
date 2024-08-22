require('dotenv').config()
import { Server, Socket } from "socket.io";
import { DataTypes, isAuthedData } from "../model/eventData";
import { MatchController } from "../controller/MatchController";
import logging from "../util/Logging";
import { readFileSync } from "fs";
import { createServer } from "https";
const Log = logging("WebsocketIncoming");

export class WebsocketIncoming {
    wss: Server;
    authedClients: ClientUser[] = [];
    matchController = MatchController.getInstance();

    constructor() {

        const options = {
            key: readFileSync(process.env.SERVER_KEY!),
            cert: readFileSync(process.env.SERVER_CERT!),
            requestCert: true,
            ca: [
                readFileSync(process.env.CLIENT_CERT!)
            ]
        }

        const httpsServer = createServer(options);

        this.wss = new Server(httpsServer, {
            perMessageDeflate: {
                zlibDeflateOptions: {
                    chunkSize: 1024,
                    memLevel: 7,
                    level: 3
                },
                zlibInflateOptions: {
                    chunkSize: 10 * 1024
                },
                threshold: 1024
            },
            cors: { origin: "*" }
        });

        this.wss.on(`connection`, (ws) => {
            const user = new ClientUser("New User", "Unknown Team", ws)

            ws.on('error', (e) => {
                Log.error(`${user.name} encountered a Websocket error.`);
            });

            ws.once('obs_logon', (msg) => {
                try {
                    const json = JSON.parse(msg.toString());
                    if (json.type === DataTypes.AUTH && this.matchController.createMatch(json)) {
                        ws.emit("obs_logon_ack", JSON.stringify({ type: DataTypes.AUTH, value: true }));
                        user.name = json.obsName;
                        user.groupCode = json.groupCode;
                        this.authedClients.push(user);

                        Log.info(`Received VALID auth request from ${json.obsName}, using Group Code ${json.groupCode} with teams ${json.leftTeam.name} and ${json.rightTeam.name}`);
                        this.onAuthSuccess(user);
                    } else {
                        ws.emit("obs_logon_ack", JSON.stringify({ type: DataTypes.AUTH, value: false }));
                        ws.disconnect();
                        Log.info(`Received BAD auth request from ${json.obsName}, using Group Code ${json.groupCode}`);
                    }
                } catch (e) {
                    Log.error(`Error parsing incoming auth request: ${e}`);
                }
            });

        });

        httpsServer.listen(5100);
        Log.info(`InhouseTracker Server ingesting on port 5100!`);
    }

    private onAuthSuccess(user: ClientUser) {
        user.ws.on("obs_data", (msg: any) => {
            try {
                const data = JSON.parse(msg.toString());
                if (isAuthedData(data)) {
                    this.matchController.receiveMatchData(data);
                }
            } catch (e) {
                Log.error(`Error parsing obs_data: ${e}`);
            }
            
        });
    }

}

class ClientUser {
    name: string;
    groupCode: string;
    ws: Socket;

    constructor(name: string, groupCode: string, ws: Socket) {
        this.name = name;
        this.groupCode = groupCode;
        this.ws = ws;
    }
}


export interface AuthTeam {
    name: string,
    tricode: string,
    url: string,
    attackStart: boolean
}