import { Team } from "./Team";
import {
  DataTypes,
  IAuthedAuxData,
  IAuthedData,
  IAuthenticationData,
  IFormattedAuxiliary,
  IFormattedRoundInfo,
  IFormattedScore,
  IFormattedScoreboard,
} from "./eventData";
import logging from "../util/Logging";
import { ReplayLogging } from "../util/ReplayLogging";
import { Maps } from "../util/ValorantInternalTranslator";
import { MatchController } from "../controller/MatchController";
import { DatabaseConnector } from "../connector/databaseConnector";
import { ToolsData } from "./ToolsData";
const Log = logging("Match");

export class Match {
  public matchId: string = "";
  private matchType: "bomb" | "swift" | string = "bomb";
  private switchRound = 13;
  private firstOtRound = 25;

  public groupCode;
  public isRunning: boolean = false;

  public roundNumber: number = 0;
  public roundPhase: string = "LOBBY";
  private roundTimeoutTime?: number = undefined;
  private wasTimeout: boolean = false;
  private spikeDetonationTime?: number = undefined;

  private teams: Team[] = [];
  private map: string = "Loading";
  private spikeState: SpikeStates = { planted: false, detonated: false, defused: false };
  private attackersWon: boolean = false;

  private timeoutState: TimeoutStates = {
    techPause: false,
    leftTeam: false,
    rightTeam: false,
    timeRemaining: 0,
  };
  private timeoutEndTimeout: any = undefined;
  private timeoutRemainingLoop: any = undefined;

  private tools: ToolsData;

  // private ranks: { team1: string[]; team2: string[] } = { team1: [], team2: [] };

  private replayLog: ReplayLogging;
  public eventNumber: number = 1;
  public organizationId: string = "";
  public isRegistered: boolean = false;

  constructor(data: IAuthenticationData) {
    this.groupCode = data.groupCode;

    this.replayLog = new ReplayLogging(data);

    const firstTeam = new Team(data.leftTeam);
    const secondTeam = new Team(data.rightTeam);

    this.teams.push(firstTeam);
    this.teams.push(secondTeam);

    this.tools = new ToolsData(data.toolsData);

    if (process.env.USE_BACKEND === "true") {
      this.organizationId = data.organizationId || "";
    }
  }

  async receiveMatchSpecificData(data: IAuthedData | IAuthedAuxData) {
    this.replayLog.write(data);

    let correctTeam = null;
    switch (data.type) {
      case DataTypes.SCOREBOARD:
      case DataTypes.ROSTER:
        correctTeam = this.teams.find(
          (team) => team.ingameTeamId == (data.data as IFormattedScoreboard).startTeam,
        );

        if (correctTeam == null) {
          Log.error(
            `Received match data with invalid team for group code "${(data as IAuthedData).groupCode}"`,
          );
          Log.debug(`Data: ${JSON.stringify(data)}`);
          return;
        }

        correctTeam.receiveTeamSpecificData(data);
        break;

      case DataTypes.KILLFEED:
        this.teams.forEach((team) => team.receiveTeamSpecificData(data));
        break;

      case DataTypes.OBSERVING:
        for (const team of this.teams) {
          team.setObservedPlayer(data.data as string);
        }
        break;

      case DataTypes.AUX_SCOREBOARD:
      case DataTypes.AUX_ABILITIES:
      case DataTypes.AUX_HEALTH:
      case DataTypes.AUX_ASTRA_TARGETING:
      case DataTypes.AUX_CYPHER_CAM:
        this.teams.forEach((team) => team.receiveTeamSpecificData(data));
        break;

      case DataTypes.AUX_SCOREBOARD_TEAM:
        this.teams.forEach((team) =>
          team.receiveAuxScoreboardTeamData(data as IFormattedAuxiliary),
        );
        break;

      case DataTypes.SPIKE_PLANTED:
        if (this.roundPhase !== "combat") break;
        this.spikeState.planted = true;
        this.roundTimeoutTime = undefined;
        this.spikeDetonationTime = data.timestamp + 45 * 1000; // Add 45 seconds to the current time
        break;

      case DataTypes.SPIKE_DETONATED:
        this.spikeState.detonated = true;
        this.spikeDetonationTime = undefined;
        break;

      case DataTypes.SPIKE_DEFUSED:
        this.spikeState.defused = true;
        break;

      case DataTypes.SCORE:
        this.processScoreCalculation(data.data as IFormattedScore, data.timestamp);
        this.spikeState.planted = false;
        break;

      case DataTypes.ROUND_INFO:
        this.roundNumber = (data.data as IFormattedRoundInfo).roundNumber;
        this.roundPhase = (data.data as IFormattedRoundInfo).roundPhase;

        switch (this.roundPhase) {
          case "shopping":
            if (this.roundNumber !== 1) {
              this.processRoundReasons();
            }

            this.spikeState.planted = false;
            this.spikeState.detonated = false;
            this.spikeState.defused = false;

            // eslint-disable-next-line no-case-declarations
            let isSwitchRound = false;
            if (this.roundNumber == this.switchRound || this.roundNumber >= this.firstOtRound) {
              for (const team of this.teams) {
                team.switchSides();
              }
              isSwitchRound = true;
            }

            this.teams.forEach((team) => team.resetRoundSpecificValues(isSwitchRound));

            if (this.isRegistered && this.roundNumber !== 1) {
              DatabaseConnector.updateMatch(this);
            }

            break;

          case "combat":
            this.teams.forEach((team) => team.findDuplicateAgents());
            this.roundTimeoutTime = data.timestamp + 99 * 1000; // Add 99 seconds to the current time
            break;

          case "end":
            this.roundTimeoutTime = undefined;
            this.spikeDetonationTime = undefined;
            break;

          case "game_end":
            this.isRunning = false;
            this.eventNumber++;
            MatchController.getInstance().removeMatch(this.groupCode);

            if (this.isRegistered) {
              DatabaseConnector.completeMatch(this);
            }

            return;
        }

        break;

      case DataTypes.MATCH_START:
        this.matchId = data.data as string;
        this.isRunning = true;

        if (process.env.USE_BACKEND === "true") {
          await DatabaseConnector.registerMatch(this);
          this.isRegistered = true;
        }

        break;

      case DataTypes.MAP:
        this.map = Maps[data.data as keyof typeof Maps];
        break;

      case DataTypes.GAME_MODE:
        this.matchType = data.data as string;
        switch (this.matchType) {
          case "swift":
            this.switchRound = 5;
            this.firstOtRound = 99;
            break;

          case "bomb":
          default:
            this.switchRound = 13;
            this.firstOtRound = 25;
            break;
        }
        break;

      case DataTypes.TECH_PAUSE:
        this.timeoutState.techPause = !this.timeoutState.techPause;
        if (this.timeoutState.techPause) {
          this.timeoutState.leftTeam = false;
          this.timeoutState.rightTeam = false;
          clearTimeout(this.timeoutEndTimeout);
          clearInterval(this.timeoutRemainingLoop);
          this.timeoutEndTimeout = null;
        }
        break;

      case DataTypes.LEFT_TIMEOUT:
        this.timeoutState.leftTeam = !this.timeoutState.leftTeam;
        if (this.timeoutState.leftTeam) {
          this.timeoutState.rightTeam = false;
          this.timeoutState.techPause = false;
          this.timeoutState.timeRemaining = this.tools.timeoutDuration;
          this.startTimeoutEndTimeout();
        } else {
          clearTimeout(this.timeoutEndTimeout);
        }
        break;

      case DataTypes.RIGHT_TIMEOUT:
        this.timeoutState.rightTeam = !this.timeoutState.rightTeam;
        if (this.timeoutState.rightTeam) {
          this.timeoutState.leftTeam = false;
          this.timeoutState.techPause = false;
          this.timeoutState.timeRemaining = this.tools.timeoutDuration;
          this.startTimeoutEndTimeout();
        } else {
          clearTimeout(this.timeoutEndTimeout);
        }
        break;
    }

    this.eventNumber++;
  }

  private startTimeoutEndTimeout() {
    clearTimeout(this.timeoutEndTimeout);
    this.timeoutEndTimeout = null;

    clearInterval(this.timeoutRemainingLoop);
    this.timeoutRemainingLoop = null;

    this.timeoutEndTimeout = setTimeout(() => {
      this.timeoutState.leftTeam = false;
      this.timeoutState.rightTeam = false;
      clearInterval(this.timeoutRemainingLoop);
      this.eventNumber++;
    }, this.tools.timeoutDuration * 1000);

    this.timeoutRemainingLoop = setInterval(() => {
      if (this.timeoutState.timeRemaining > 0) {
        this.timeoutState.timeRemaining--;
        this.eventNumber++;
      } else {
        clearInterval(this.timeoutRemainingLoop);
      }
    }, 1000);
  }

  private processScoreCalculation(data: IFormattedScore, eventTimestamp: number) {
    const team0NewScore = data.team_0;
    const team1NewScore = data.team_1;
    const team0 = this.teams.find((team) => team.ingameTeamId == 0)!;
    const team1 = this.teams.find((team) => team.ingameTeamId == 1)!;

    if (team0NewScore > team0.roundsWon) {
      this.attackersWon = team0.isAttacking;
    } else if (team1NewScore > team1.roundsWon) {
      this.attackersWon = team1.isAttacking;
    }

    if (this.roundTimeoutTime && eventTimestamp >= this.roundTimeoutTime) {
      this.wasTimeout = true;
    } else {
      this.wasTimeout = false;
    }

    team0.roundsWon = team0NewScore;
    team1.roundsWon = team1NewScore;
  }

  private processRoundReasons() {
    const attackingTeam = this.teams.find((team) => team.isAttacking == true)!;
    const defendingTeam = this.teams.find((team) => team.isAttacking == false)!;

    if (this.attackersWon) {
      if (this.spikeState.detonated) {
        attackingTeam.addRoundReason("detonated", this.roundNumber - 1);
      } else {
        attackingTeam.addRoundReason("kills", this.roundNumber - 1);
      }

      defendingTeam.addRoundReason("lost", this.roundNumber - 1);
    } else {
      if (this.spikeState.defused) {
        defendingTeam.addRoundReason("defused", this.roundNumber - 1);
      } else if (this.wasTimeout) {
        defendingTeam.addRoundReason("timeout", this.roundNumber - 1);
      } else {
        defendingTeam.addRoundReason("kills", this.roundNumber - 1);
      }

      attackingTeam.addRoundReason("lost", this.roundNumber - 1);
    }
  }

  public setAuxDisconnected(playerId: string) {
    this.teams.forEach((team) => team.setAuxDisconnected(playerId));
  }

  private debugLogRoundInfo() {
    Log.debug(`Round ${this.roundNumber} - ${this.roundPhase}`);
    Log.debug(`Round Timeout: ${this.roundTimeoutTime}`);
    Log.debug(`Spike State: ${JSON.stringify(this.spikeState)}`);
    const attackingTeam = this.teams.find((team) => team.isAttacking);
    const defendingTeam = this.teams.find((team) => !team.isAttacking);
    Log.debug(
      `Attacking Team: ${attackingTeam?.alivePlayers()} - Defending Team: ${defendingTeam?.alivePlayers()}`,
    );
  }
}

export interface SpikeStates {
  planted: boolean;
  detonated: boolean;
  defused: boolean;
}

export interface TimeoutStates {
  techPause: boolean;
  leftTeam: boolean;
  rightTeam: boolean;
  timeRemaining: number;
}
