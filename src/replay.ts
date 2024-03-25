import { WebSocket } from 'ws';
import { DataTypes, IFormattedData } from './model/eventData';
import { readFileSync } from "fs";
import logging from "./util/Logging";
const Log = logging("Replay").level(1);

const INGEST_SERVER_URL = "ws://localhost:5100/ingest";
let REPLAY_GAME = "customGameTest.replay";
let DELAY_MS = 1000;

const args = process.argv;
for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    let logString = `Parameter ${arg}`;

    switch(arg) {
        case "-delay":
            DELAY_MS = parseInt(args[++i]);
            logString += ` = ${DELAY_MS}`;
            break;
        case "-game":
            REPLAY_GAME = args[++i];
            logString += ` = ${REPLAY_GAME}`;
            break;
    }
    Log.debug(logString);
}

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
                        Log.info('Authentication successful!');
                        this.enabled = true;
                        this.websocketSetup();
                        resolve();
                    } else {
                        Log.info('Authentication failed!');
                        this.enabled = false;
                        this.ws?.terminate();
                        reject();
                    }
                }
            });

            this.ws.on('close', () => {
                Log.info('Connection to ingest server closed');
                if (this.unreachable === true) {
                    Log.info(`Inhouse Tracker | Connection failed, server not reachable`);
                } else {
                    Log.info(`Inhouse Tracker | Connection closed`);
                }
                this.enabled = false;
                this.ws?.terminate();
                reject();
            });

            this.ws.on('error', (e: any) => {
                Log.info('Failed connection to ingest server - is it up?');
                if (e.code === "ECONNREFUSED") {
                    Log.info(`Inhouse Tracker | Connection failed, server not reachable`);
                    this.unreachable = true;
                } else {
                    Log.info(`Inhouse Tracker | Connection failed`);
                }
                Log.info(e);
                reject();
            });
        });
    }


    private websocketSetup() {
        this.ws.on('message', (msg) => {
            const json = JSON.parse(msg.toString());
            Log.info(json);
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

    close() {
        if (this.enabled) {
            this.ws.close();
            this.enabled = false;
        }
    }
}

const conn = ConnectorService.getInstance();
conn.handleAuthProcess("Dunkel#Licht", "TestTeam", "A").then(() => {

    const replayContent = readFileSync(REPLAY_GAME).toString();
    const replayObj = JSON.parse(`[${replayContent}]`);
    const replayHeader = replayObj.shift();
    const gameObj: IFormattedData[] = replayObj;

    Log.info(`Loaded replay file ${REPLAY_GAME}`);
    Log.info("Header info is:");
    Log.info(replayHeader);

    if (DELAY_MS > 0) {

        let idx = 0;
        const intervalId = setInterval(() => {
            const curr = gameObj[idx];
            if (curr == null) {
                //exit condition
                clearInterval(intervalId);
                finished();
                return;
            }
            conn.sendToIngestNoOverhead(curr);
            idx++;
            Log.info(`Sent ${curr.type} event, waiting ${DELAY_MS}ms`);
        }, DELAY_MS);

    } else {

        gameObj.forEach(element => {
            conn.sendToIngestNoOverhead(element);
        });
        finished();

    }

});

function finished() {
    Log.info("Replay finished");
    conn.close();
}
