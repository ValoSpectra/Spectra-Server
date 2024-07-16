import WebSocket, { WebSocketServer } from "ws";
import { MatchController } from "../controller/MatchController";
import logging from "../util/Logging";
const Log = logging("WebsocketIncoming");

interface CustomWebSocket extends WebSocket {
    groupCode?: string;
}

export class WebsocketOutgoing {
    private static instance: WebsocketOutgoing;
    wss: WebSocketServer;
    matchController = MatchController.getInstance();

    
    public static getInstance(): WebsocketOutgoing{
        if (WebsocketOutgoing.instance == null) WebsocketOutgoing.instance = new WebsocketOutgoing();
        return WebsocketOutgoing.instance;
    }

    private constructor() {

        this.wss = new WebSocketServer({
            port: 5200,
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
            path: "/output"
        });

        this.wss.on(`connection`, (ws: CustomWebSocket) => {
            ws.on('error', (e) => {
                Log.info(`Someone in ${ws.groupCode} encountered a Websocket error: ${e}`);
            });

            ws.once('message', (msg) => {
                const json = JSON.parse(msg.toString());
                ws.groupCode = json.groupCode;
                ws.send(JSON.stringify({ groupCode: json.groupCode, msg: `Logon succeeded for group code ${json.groupCode}` }));
                Log.info(`Received output logon using Group Code ${json.groupCode}`);
            });
        });

        Log.info(`InhouseTracker Server outputting on port 5200!`);
    }
    
    sendMatchData(groupCode: string, data: any) {
        this.wss.clients.forEach((ws: CustomWebSocket) => {
            if (ws.groupCode === groupCode && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(data));
            }
        });
    }

}