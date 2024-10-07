import { Server, Socket } from "socket.io";
import { MatchController } from "../controller/MatchController";
export declare class WebsocketIncoming {
    wss: Server;
    static authedClients: ClientUser[];
    matchController: MatchController;
    constructor();
    private onAuthSuccess;
    private validateKey;
    static disconnectGroupCode(groupCode: string): void;
}
declare class ClientUser {
    name: string;
    groupCode: string;
    ws: Socket;
    constructor(name: string, groupCode: string, ws: Socket);
}
export interface AuthTeam {
    name: string;
    tricode: string;
    url: string;
    attackStart: boolean;
}
export {};
