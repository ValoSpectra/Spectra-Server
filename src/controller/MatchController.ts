import { WebsocketIncoming } from "../connector/websocketIncoming";
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
  private eventTimes: Record<string, number> = {};

  private constructor() {}

  public static getInstance(): MatchController {
    if (MatchController.instance == null) MatchController.instance = new MatchController();
    return MatchController.instance;
  }

  async createMatch(data: IAUthenticationData) {
    try {
      if (this.matches[data.groupCode] != null) {
        return false;
      }
      const newMatch = new Match(data);
      // if (process.env.USE_BACKEND === "true") {
      //     const newMatchId = await DatabaseConnector.createMatch(newMatch);
      //     newMatch.backendId = newMatchId;
      // }
      this.matches[data.groupCode] = newMatch;
      this.eventNumbers[data.groupCode] = 0;
      this.startOutgoingSendLoop();
      Log.info(`New match "${newMatch.groupCode}" registered!`);
      return true;
    } catch (e) {
      Log.info(`Failed to create match with group code ${data.groupCode}, ${e}`);
      return false;
    }
  }

  removeMatch(groupCode: string) {
    if (this.matches[groupCode] != null) {
      delete this.matches[groupCode];
      delete this.eventNumbers[groupCode];
      WebsocketIncoming.disconnectGroupCode(groupCode);
      Log.info(`Deleted match with group code ${groupCode}`);
      if (Object.keys(this.matches).length == 0 && this.sendInterval != null) {
        clearInterval(this.sendInterval);
        this.sendInterval = null;
        Log.info(`Last match concluded, send loop stopped`);
      }
    }
  }

  async receiveMatchData(data: IAuthedData) {
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

    await trackedMatch.receiveMatchSpecificData(data);
  }

  sendMatchDataForLogon(groupCode: string) {
    if (this.matches[groupCode] != null) {
      this.outgoingWebsocketServer.sendMatchData(groupCode, this.matches[groupCode]);
    }
  }

  private startOutgoingSendLoop() {
    if (this.sendInterval != null) {
      Log.info(`Match registered with active send loop, skipping start`);
      return;
    }
    Log.info(`Match registered without active send loop, send loop started`);
    this.sendInterval = setInterval(async () => {
      for (const groupCode in this.matches) {
        if (this.matches[groupCode].eventNumber > this.eventNumbers[groupCode]) {
          this.outgoingWebsocketServer.sendMatchData(groupCode, this.matches[groupCode]);
          this.eventNumbers[groupCode] = this.matches[groupCode].eventNumber;
          this.eventTimes[groupCode] = Date.now();
        } else {
          // Check if the last event was more than 30 minutes ago
          if (Date.now() - this.eventTimes[groupCode] > 1000 * 60 * 30) {
            Log.info(
              `Match with group code ${groupCode} has been inactive for more than 30 minutes, removing.`,
            );
            // if (this.matches[groupCode].backendId !== -1) {
            //     await DatabaseConnector.endMatch(this.matches[groupCode].backendId, this.matches[groupCode]);
            // }
            this.removeMatch(groupCode);
          }
        }
      }
    }, 100);
  }
}
