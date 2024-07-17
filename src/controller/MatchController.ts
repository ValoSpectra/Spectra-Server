import { WebsocketOutgoing } from "../connector/websocketOutgoing";
import { Match } from "../model/Match";
import { IAuthedData, IAUthenticationData } from "../model/eventData";
import logging from "../util/Logging";
const Log = logging("MatchController");

export class MatchController {
    private static instance: MatchController;
    private outgoingWebsocketServer: WebsocketOutgoing = WebsocketOutgoing.getInstance();
    private sendInterval: NodeJS.Timeout | null = null;

    private matches: Record<string, Match> = {};

    private constructor() { };

    public static getInstance(): MatchController {
        if (MatchController.instance == null) MatchController.instance = new MatchController();
        return MatchController.instance;
    }

    removeMatch(data: any) {
        if (this.matches[data.groupCode]) {
            delete this.matches[data.groupCode];
            Log.info(`Removed match ${data.groupCode}!`);
        }
    }

    setRanks(data: any) {
        if (this.matches[data.groupCode] != null) {
            this.matches[data.groupCode]!.setRanks(data);
        }
    }

    createMatch(data: IAUthenticationData) {
        try {
            const newMatch = new Match(data.groupCode, data.leftTeam, data.rightTeam);
            this.matches[data.groupCode] = newMatch;
            this.startOutgoingSendLoop();
            Log.info(`New match "${newMatch.groupCode}" registered!`);
            return true;
        } catch (e) {
            Log.info(`Failed to create match with group code ${data.groupCode}`);
            return false;
        }
    }

    receiveMatchData(data: IAuthedData) {
        data.timestamp = Date.now();
        const trackedMatch = this.matches[data.groupCode];
        if (trackedMatch == null) {
            // How did we even get here?
            Log.info(`Received match data with invalid game "${data.groupCode}"`);
            return;
        }

        trackedMatch.receiveMatchSpecificData(data)
    }

    private startOutgoingSendLoop() {
        if (this.sendInterval != null) return;
        this.sendInterval = setInterval(() => {
            for (const groupCode in this.matches) {
                this.outgoingWebsocketServer.sendMatchData(groupCode, this.matches[groupCode]);
            }
        }, 100);
    }

}