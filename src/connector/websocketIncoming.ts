require('dotenv').config()
import { Server, Socket } from "socket.io";
import { DataTypes, IAUthenticationData, isAuthedData } from "../model/eventData";
import { MatchController } from "../controller/MatchController";
import logging from "../util/Logging";
import { readFileSync } from "fs";
import { createServer } from "https";
import { createServer as createInsecureServer } from "http";
import { ValidKeys } from "../util/ValidKeys";
import { DatabaseConnector } from "./databaseConnector";
const Log = logging("WebsocketIncoming");

export class WebsocketIncoming {
    wss: Server;
    static authedClients: ClientUser[] = [];
    matchController = MatchController.getInstance();

    constructor() {

        let serverInstance;

        if (process.env.INSECURE == "true") {
            serverInstance = createInsecureServer();
        }
        else {
            if (!process.env.SERVER_KEY || !process.env.SERVER_CERT) {
                Log.error(`Missing TLS key or certificate! Please provide the paths to the key and certificate in the .env file. (SERVER_KEY and SERVER_CERT)`);
            }
    
            const options = {
                key: readFileSync(process.env.SERVER_KEY!),
                cert: readFileSync(process.env.SERVER_CERT!)
            }
    
            serverInstance = createServer(options);
        }

        this.wss = new Server(serverInstance, {
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

            ws.once('obs_logon', async (msg) => {
                try {
                    const authenticationData: IAUthenticationData = JSON.parse(msg.toString());
                    if (authenticationData.type === DataTypes.AUTH) {

                        if (await this.validateKey(authenticationData.key)) {

                            if (await this.matchController.createMatch(authenticationData)) {
                                ws.emit("obs_logon_ack", JSON.stringify({ type: DataTypes.AUTH, value: true }));
                                user.name = authenticationData.obsName;
                                user.groupCode = authenticationData.groupCode;
                                WebsocketIncoming.authedClients.push(user);

                                Log.info(`Received VALID auth request from ${authenticationData.obsName}, using Group Code ${authenticationData.groupCode} and with teams ${authenticationData.leftTeam.name} and ${authenticationData.rightTeam.name}`);
                                this.onAuthSuccess(user);
                            } else {
                                ws.emit("obs_logon_ack", JSON.stringify({ type: DataTypes.AUTH, value: false, reason: `Game with Group Code ${authenticationData.groupCode} exists and is still live.` }));
                                ws.disconnect();
                                Log.info(`Received BAD auth request from ${authenticationData.obsName}, using Group Code ${authenticationData.groupCode} and key ${authenticationData.key}`);
                            }

                        } else {
                            ws.emit("obs_logon_ack", JSON.stringify({ type: DataTypes.AUTH, value: false, reason: `Invalid key provided.` }));
                            ws.disconnect();
                            Log.info(`Received BAD auth request from ${authenticationData.obsName}, using Group Code ${authenticationData.groupCode} and key ${authenticationData.key}`);
                        }

                    }
                } catch (e) {
                    Log.error(`Error parsing incoming auth request: ${e}`);
                }
            });

        });

        serverInstance.listen(5100);
        Log.info(`InhouseTracker Server ingesting on port 5100!`);
    }

    private onAuthSuccess(user: ClientUser) {
        user.ws.on("obs_data", async (msg: any) => {
            try {
                const data = JSON.parse(msg.toString());
                if (isAuthedData(data)) {
                    await this.matchController.receiveMatchData(data);
                }
            } catch (e) {
                Log.error(`Error parsing obs_data: ${e}`);
            }

        });
    }

    private async validateKey(key: string) {
        if (process.env.REQUIRE_AUTH_KEY === "false") return true;
        if (process.env.USE_BACKEND === "true" && await DatabaseConnector.verifyAccessKey(key)) return true;
        if (ValidKeys.includes(key)) return true;
        return false;
    }

    public static disconnectGroupCode(groupCode: string) {
        for (const client of WebsocketIncoming.authedClients) {
            if (client.groupCode === groupCode) {
                client.ws.disconnect();
            }
        }
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