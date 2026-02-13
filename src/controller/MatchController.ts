import { DatabaseConnector } from "../connector/databaseConnector";
import { WebsocketIncoming } from "../connector/websocketIncoming";
import { WebsocketOutgoing } from "../connector/websocketOutgoing";
import { Match } from "../model/Match";
import { IAuthedAuxData, IAuthedData, IAuthenticationData } from "../model/eventData";
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

  async createMatch(data: IAuthenticationData) {
    try {
      const existingMatch = this.matches[data.groupCode];
      if (existingMatch != null) {
        if (data.groupSecret !== existingMatch.groupSecret) {
          Log.info(
            `Match with group code ${data.groupCode} already exists with different secret, rejecting logon attempt.`,
          );
          return "";
        }
        Log.info(
          `Match with group code ${data.groupCode} already exists and secret was correct, reconnected.`,
        );
        return "reconnected";
      }
      const newMatch = new Match(data);

      this.matches[data.groupCode] = newMatch;
      this.eventNumbers[data.groupCode] = 0;
      Log.info(`New match "${newMatch.groupCode}" registered!`);
      this.startOutgoingSendLoop();
      return newMatch.groupSecret;
    } catch (e) {
      Log.info(`Failed to create match with group code ${data.groupCode}, ${e}`);
      return "";
    }
  }

  findMatch(matchId: string) {
    return Object.values(this.matches).find((match) => match.matchId == matchId)?.groupCode ?? null;
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

  getMatchCount() {
    return Object.keys(this.matches).length;
  }

  async receiveMatchData(data: IAuthedData | IAuthedAuxData) {
    data.timestamp = Date.now();

    if ("groupCode" in data) {
      const trackedMatch = this.matches[data.groupCode];
      if (trackedMatch == null) {
        // How did we even get here?
        Log.info(`Received match data with invalid game "${data.groupCode}"`);
        return;
      }

      await trackedMatch.receiveMatchSpecificData(data);

      // Aux data handling, as it can be sent to multiple matches
    } else if ("matchId" in data) {
      for (const match of Object.values(this.matches)) {
        if (match.matchId == data.matchId) {
          await match.receiveMatchSpecificData(data);
        }
      }
    }
  }

  async receiveAuxMatchData(data: IAuthedAuxData) {
    data.timestamp = Date.now();
    for (const match of Object.values(this.matches)) {
      if (match.matchId == data.matchId) {
        await match.receiveMatchSpecificData(data);
      }
    }
  }

  setAuxDisconnected(groupCode: string, playerId: string) {
    if (this.matches[groupCode] != null) {
      this.matches[groupCode].setAuxDisconnected(playerId);
    }
  }

  sendMatchDataForLogon(groupCode: string) {
    if (this.matches[groupCode] != null) {
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        replayLog,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        eventNumber,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        timeoutEndTimeout,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        timeoutRemainingLoop,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        playercamUrl,
        ...formattedData
      } = this.matches[groupCode] as any;

      this.outgoingWebsocketServer.sendMatchData(groupCode, formattedData);
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

            try {
              if (this.matches[groupCode].isRegistered) {
                await DatabaseConnector.completeMatch(this.matches[groupCode]);
              }
            } catch (e) {
              Log.error(`Failed to complete match in backend with group code ${groupCode}, ${e}`);
            }

            this.removeMatch(groupCode);
          }
        }
      }
    }, 100);
  }
}
