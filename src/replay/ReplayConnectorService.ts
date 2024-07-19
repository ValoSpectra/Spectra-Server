import { DataTypes, IAuthedData, IFormattedData } from "../model/eventData";
import logging from "../util/Logging";
import { AuthTeam } from "../connector/websocketIncoming";
import * as io from "socket.io-client";
const Log = logging("ReplayConnectorService");

export class ReplayConnectorService {
    
    private obsName = "Replayuser#test";
    private groupCode = "A";
    private leftTeam: AuthTeam = {name: "Left Team", tricode: "LEFT", url: "https://dnkl.gg/PHtt7", attackStart: true};
    private rightTeam: AuthTeam = {name: "Right Team", tricode: "RIGHT", url: "https://dnkl.gg/8GKvE", attackStart: false};
    private ingestServerUrl: string;
    private enabled = false;
    private unreachable = false;
    private ws!: io.Socket;

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

            this.ws = io.connect(this.ingestServerUrl);
            this.ws.emit('obs_logon', JSON.stringify({ 
                    type: DataTypes.AUTH, 
                    obsName: this.obsName, 
                    groupCode: this.groupCode,
                    leftTeam: this.leftTeam,
                    rightTeam: this.rightTeam
                })
            );
            this.ws.once('obs_logon_ack', (msg) => {
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
                        this.ws?.disconnect();
                        reject();
                    }
                }
            });

            this.ws.io.on('close', () => {
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
            this.ws.emit("obs_data", JSON.stringify(data));
        }
        else {
            Log.error("Tried to send event anthough webservice is not enabled. Too early?");
        }
    }

}