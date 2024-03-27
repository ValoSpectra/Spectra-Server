import { DataTypes, IAuthedData, IFormattedData } from "../model/eventData";
import { WebSocket } from "ws";
import logging from "../util/Logging";
const Log = logging("ReplayConnectorService");

export class ReplayConnectorService {
    
    private playerName = "Replayuser#test";
    private teamName = "TestTeam";
    private groupCode = "A";
    private ingestServerUrl: string;
    private enabled = false;
    private unreachable = false;
    private ws!: WebSocket;

    public constructor(ingestServerUrl: string) { 
        this.ingestServerUrl = ingestServerUrl;
    }

    public setAuthValues(playerName: string, teamName: string, groupCode: string) {
        this.playerName = playerName;
        this.teamName = teamName;
        this.groupCode = groupCode;
    }

    public open(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.handleAuthProcess().then(() => {resolve()});
        });
    }

    public close() {
        if (this.enabled) {
            this.ws.close();
            this.enabled = false;
        }
    }

    private handleAuthProcess() {
        return new Promise<void>((resolve, reject) => {

            this.ws = new WebSocket(this.ingestServerUrl);
            this.ws.once('open', () => {
                this.ws.send(JSON.stringify({ 
                    type: DataTypes.AUTH, 
                    playerName: this.playerName, 
                    teamName: this.teamName, 
                    groupCode: this.groupCode 
                }));
            });
            this.ws.once('message', (msg) => {
                const json = JSON.parse(msg.toString());

                if (json.type === DataTypes.AUTH) {
                    if (json.value === true) {
                        Log.info('Authentication successful!');
                        this.enabled = true;
                        this.websocketSetup();
                        resolve();
                    } else {
                        Log.error('Authentication failed!');
                        this.enabled = false;
                        this.ws?.terminate();
                        reject();
                    }
                }
            });

            this.ws.on('close', () => {
                this.onSocketClose();
                reject();
            });

            this.ws.on('error', (e: any) => {
                this.onSocketError(e);
                reject();
            });
        });
    }

    private onSocketClose() {
        Log.info('Connection to ingest server closed');
        if (this.unreachable === true) {
            Log.error(`Inhouse Tracker | Connection failed, server not reachable`);
        } else {
            Log.info(`Inhouse Tracker | Connection closed`);
        }
        this.enabled = false;
        this.ws?.terminate();
    }

    private onSocketError(e: any) {
        Log.error('Failed connection to ingest server - is it up?');
        if (e.code === "ECONNREFUSED") {
            Log.error(`Inhouse Tracker | Connection failed, server not reachable`);
            this.unreachable = true;
        } else {
            Log.error(`Inhouse Tracker | Connection failed`);
        }
        Log.info(e);
    }

    private websocketSetup() {
        this.ws.on('message', (msg) => {
            const json = JSON.parse(msg.toString());
            Log.info(json);
        });
    }

    public sendReplayData(data: IAuthedData) {
        if (this.enabled) {
            Log.info(`Sending ${data.type} event`);
            this.ws.send(JSON.stringify(data));
        }
        else {
            Log.error("Tried to send event anthough webservice is not enabled. Too early?");
        }
    }

}