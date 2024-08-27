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
    private eventNumbers: Record<string, number> = {};

    private constructor() { };

    public static getInstance(): MatchController {
        if (MatchController.instance == null) MatchController.instance = new MatchController();
        return MatchController.instance;
    }

    createMatch(data: IAUthenticationData) {
        try {
            if (this.matches[data.groupCode] != null) {
                return false;
            }
            const newMatch = new Match(data.groupCode, data.leftTeam, data.rightTeam);
            this.matches[data.groupCode] = newMatch;
            this.eventNumbers[data.groupCode] = 0;
            this.startOutgoingSendLoop();
            Log.info(`New match "${newMatch.groupCode}" registered!`);
            return true;
        } catch (e) {
            Log.info(`Failed to create match with group code ${data.groupCode}`);
            return false;
        }
    }

    removeMatch(groupCode: string) {
        if (this.matches[groupCode] != null) {
            delete this.matches[groupCode];
            delete this.eventNumbers[groupCode];
            Log.info(`Deleted match with group code ${groupCode}`);
            if (Object.keys(this.matches).length == 0 && this.sendInterval != null) {
                clearInterval(this.sendInterval);
                Log.info(`Last match concluded, stopping send loop`);
            }
        }
    }

    receiveMatchData(data: IAuthedData) {
        if (data.timestamp == null) {
            data.timestamp = Date.now();
        }
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
                if (this.matches[groupCode].eventNumber > this.eventNumbers[groupCode]) {
                    this.outgoingWebsocketServer.sendMatchData(groupCode, this.matches[groupCode]);
                    this.eventNumbers[groupCode] = this.matches[groupCode].eventNumber;
                }
            }
        }, 100);
    }

}