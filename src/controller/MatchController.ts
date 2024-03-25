import { Match } from "../model/Match";
import { IAuthedData, isAuthedData } from "../model/eventData";
import logging from "../util/Logging";
const Log = logging("MatchController");

export class MatchController {
    private static instance: MatchController;

    private matches: Record<string, Match | null> = {};

    private constructor() {};

    public static getInstance(): MatchController{
        if (MatchController.instance == null) MatchController.instance = new MatchController();
        return MatchController.instance;
    }

    addMatch(data: any ) {
        const newMatch = new Match(data.groupCode, data.team1.toUpperCase(), data.team2.toUpperCase(), data.isRanked);
        this.matches[data.groupCode] = newMatch;

        Log.info(`New match "${newMatch.groupCode}" registered!`);
    }
    
    removeMatch(data: any) {
        if (this.matches[data.groupCode]) {
            delete this.matches[data.groupCode];
            Log.info(`Removed match ${data.groupCode}!`);
        }
    }

    isValidMatch(json: any) {
        const match = this.matches[json.groupCode]
        if (match != null) {
            return match.isValidTeam(json.teamName.toUpperCase());
        }

        return false;
    }

    receiveMatchData(data: IAuthedData) {
        const trackedMatch = this.matches[data.groupCode];
        if (trackedMatch == null) {
            // How did we even get here?
            Log.info(`Received match data with invalid game "${data.groupCode}"`);
            return;
        }

        trackedMatch.receiveMatchSpecificData(data)
    }

}