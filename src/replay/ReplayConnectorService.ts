import { DataTypes, IAuthedData, IFormattedData } from "../model/eventData";
import { WebSocket } from "ws";
import logging from "../util/Logging";
import { AuthTeam } from "../connector/websocketIncoming";
const Log = logging("ReplayConnectorService");

export class ReplayConnectorService {
    
    private obsName = "Replayuser#test";
    private groupCode = "A";
    private leftTeam: AuthTeam = {name: "Left Team", tricode: "LEFT", url: "https://dnkl.gg/PHtt7"};
    private rightTeam: AuthTeam = {name: "Right Team", tricode: "RIGHT", url: "https://dnkl.gg/8GKvE"};
    private ingestServerUrl: string;
    private enabled = false;
    private unreachable = false;
    private ws!: WebSocket;

    public constructor(ingestServerUrl: string) { 
        this.ingestServerUrl = ingestServerUrl;
    }

    public setAuthValues(obsName: string, groupCode: string, leftTeam: AuthTeam, rightTeam: AuthTeam) {
        this.obsName = obsName;
        this.groupCode = groupCode;
        this.leftTeam = leftTeam;
        this.rightTeam = rightTeam;
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
                    obsName: this.obsName, 
                    groupCode: this.groupCode,
                    leftTeam: this.leftTeam,
                    rightTeam: this.rightTeam
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