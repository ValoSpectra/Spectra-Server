import { WebSocket } from 'ws';
import { DataTypes, IFormattedData } from './model/eventData';
import { readFileSync } from "fs";
import { resolve } from 'path';

const INGEST_SERVER_URL = "ws://localhost:5100/ingest";
const REPLAY_GAME = "customGameTest.json";


class ConnectorService {
    private PLAYER_NAME = "";
    private TEAM_NAME = "";
    private GROUP_CODE = "";
    private enabled = false;
    private unreachable = false;
    private ws!: WebSocket;

    private static instance: ConnectorService;

    private constructor() { }

    public static getInstance(): ConnectorService {
        if (ConnectorService.instance == null) ConnectorService.instance = new ConnectorService();
        return ConnectorService.instance;
    }

    handleAuthProcess(playerName: string, teamName: string, groupCode: string) {
        return new Promise<void>((resolve, reject) => {
            this.PLAYER_NAME = playerName;
            this.TEAM_NAME = teamName.toUpperCase();
            this.GROUP_CODE = groupCode;

            this.ws = new WebSocket(INGEST_SERVER_URL);
            this.ws.once('open', () => {
                this.ws.send(JSON.stringify({ type: DataTypes.AUTH, playerName: this.PLAYER_NAME, teamName: this.TEAM_NAME, groupCode: this.GROUP_CODE }))
            });
            this.ws.once('message', (msg) => {
                const json = JSON.parse(msg.toString());

                if (json.type === DataTypes.AUTH) {
                    if (json.value === true) {
                        console.log('Authentication successful!');
                        this.enabled = true;
                        this.websocketSetup();
                        resolve();
                    } else {
                        console.log('Authentication failed!');
                        this.enabled = false;
                        this.ws?.terminate();
                        reject();
                    }
                }
            });

            this.ws.on('close', () => {
                console.log('Connection to ingest server closed');
                if (this.unreachable === true) {
                    console.log(`Inhouse Tracker | Connection failed, server not reachable`);
                } else {
                    console.log(`Inhouse Tracker | Connection closed`);
                }
                this.enabled = false;
                this.ws?.terminate();
                reject();
            });

            this.ws.on('error', (e: any) => {
                console.log('Failed connection to ingest server - is it up?');
                if (e.code === "ECONNREFUSED") {
                    console.log(`Inhouse Tracker | Connection failed, server not reachable`);
                    this.unreachable = true;
                } else {
                    console.log(`Inhouse Tracker | Connection failed`);
                }
                console.log(e);
                reject();
            });
        });
    }


    private websocketSetup() {
        this.ws.on('message', (msg) => {
            const json = JSON.parse(msg.toString());
            console.log(json);
        });
    }

    sendToIngest(formatted: IFormattedData) {
        if (this.enabled) {
            const toSend = { playerName: this.PLAYER_NAME, teamName: this.TEAM_NAME, groupCode: this.GROUP_CODE, ...formatted };
            this.ws.send(JSON.stringify(toSend));
        }
    }

    sendToIngestNoOverhead(formatted: IFormattedData) {
        if (this.enabled) {            
            this.ws.send(JSON.stringify(formatted));
        }
    }
}

const conn = ConnectorService.getInstance();
conn.handleAuthProcess("Dunkel#Licht", "TestTeam", "A").then(() => {

    const game = readFileSync(REPLAY_GAME).toString();
    const gameObj: IFormattedData[] = JSON.parse(game);

    gameObj.forEach(element => {
        conn.sendToIngestNoOverhead(element);
    });

});


