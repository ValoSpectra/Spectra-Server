import WebSocket, {WebSocketServer} from "ws";

export class WebsocketIncoming {
    wss: WebSocketServer;
    authedClients: ClientUser[] = [];

    constructor() {

        this.wss = new WebSocketServer({ 
            port: 5100,
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
            path: "/ingest"
        });

        this.wss.on(`connection`, (ws) => {
            const user = new ClientUser("New User", "Unknown Team", ws)

            ws.on('error', (e) => {
                console.log(`${user.name} encountered a Websocket error.`);
            });

            ws.on('message', (msg) => {
                console.log(`Received message ${msg} from ${user.name}`);
                const json = JSON.parse(msg.toString());
                if (json.type === "authenticate" && json.groupCode === "A") {
                    ws.send(JSON.stringify({type: "authenticate", value: true}))
                    user.name = json.playerName;
                    user.team = json.teamname;
                    this.authedClients.push(user);
                }
            });

        });

        console.log(`InhouseTracker Server listening on port 5100!`);
    }
}

class ClientUser {
    name: string;
    team: string;
    ws: WebSocket;
    
    constructor(name: string, team: string, ws: WebSocket) {
        this.name = name;
        this.team = team;
        this.ws = ws;
    }
}