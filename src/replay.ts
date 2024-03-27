import { WebSocket } from 'ws';
import { DataTypes, IAuthedData, IFormattedData } from './model/eventData';
import { readFileSync } from "fs";
import logging from "./util/Logging";
const Log = logging("Replay").level(2);

const INGEST_SERVER_URL = "ws://localhost:5100/ingest";
let REPLAY_GAME = "customGameTest.replay";
let DELAY_MS = 1000;
let REPLAY_MODE = "instant"; //instant / delay / timestamps / manual


let gameData: IAuthedData[] = [];

const args = process.argv;
for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    let logString = `Parameter ${arg}`;

    switch(arg) {
        case "-delay":
            DELAY_MS = parseInt(args[++i]);
            REPLAY_MODE = "delay";
            logString += ` = ${DELAY_MS}`;
            break;
        case "-game":
            REPLAY_GAME = args[++i];
            logString += ` = ${REPLAY_GAME}`;
            break;
        case "-timestamps":
            REPLAY_MODE = "timestamps";
            Log.info("Using timestamps mode");
            break;
        case "-manual":
            REPLAY_MODE = "manual";
            Log.info("Using manual mode");
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
                        Log.error('Authentication failed!');
                        this.enabled = false;
                        this.ws?.terminate();
                        reject();
                    }
                }
            });

            this.ws.on('close', () => {
                Log.info('Connection to ingest server closed');
                if (this.unreachable === true) {
                    Log.error(`Inhouse Tracker | Connection failed, server not reachable`);
                } else {
                    Log.info(`Inhouse Tracker | Connection closed`);
                }
                this.enabled = false;
                this.ws?.terminate();
                reject();
            });

            this.ws.on('error', (e: any) => {
                Log.error('Failed connection to ingest server - is it up?');
                if (e.code === "ECONNREFUSED") {
                    Log.error(`Inhouse Tracker | Connection failed, server not reachable`);
                    this.unreachable = true;
                } else {
                    Log.error(`Inhouse Tracker | Connection failed`);
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
    gameData = replayObj;

    Log.info(`Loaded replay file ${REPLAY_GAME}`);
    Log.info("Header info is:");
    Log.info(replayHeader);

    switch(REPLAY_MODE) {
        case "instant":
            gameData.forEach(element => {
                conn.sendToIngestNoOverhead(element as IFormattedData);
            });
            finished();
            break;
        case "delay":
            let idx = 0;
            const intervalId = setInterval(() => {
                const curr = gameData[idx] as IFormattedData;
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
            break;
        case "timestamps":
            sendWithTimestamp(0);
            break;
        case "manual":
            sendWithManual();
            break;
    }

});

function finished() {
    Log.info("Replay finished");
    conn.close();
    process.exit(0);
}

function sendWithTimestamp(index: number) {

    const obj = gameData[index];
    conn.sendToIngestNoOverhead(obj as IFormattedData);

    index++;
    if (index >= gameData.length) {
        finished();
        return;
    }
    
    const obj2 = gameData[index]; // new index
    const delay = obj2.timestamp - obj.timestamp;
    Log.info(`Sent ${obj.type} event, waiting ${delay}ms`);
    setTimeout(() => {
        sendWithTimestamp(index);
    }, delay);

}

function sendWithManual() {

    let index = 0;

    Log.info("Ready to send");
    process.stdin.on("data", (data) => {
        let s = data.toString();
        let amount = Number.parseInt(s);
        if (!Number.isNaN(amount)) {
            Log.info(`Sending the next ${amount} events`);
            for (let i = 0; i  < amount; i++) {
                conn.sendToIngestNoOverhead(gameData[index] as IFormattedData);
                Log.info(`Sent ${gameData[index].type} event`);
                index++;
                if (index >= gameData.length) break;
            }
        }
        else if (s == "\n") {
            conn.sendToIngestNoOverhead(gameData[index] as IFormattedData);
            Log.info(`Sent ${gameData[index].type} event`);
            index++;
        }
        else if (s == "exit\n") {
            finished();
        }
        if (index >= gameData.length) finished();
    });

}