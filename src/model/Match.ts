import { Team } from "./Team";
import {
  DataTypes,
  IAuthedAuxData,
  IAuthedData,
  IAuthenticationData,
  IFormattedAuxiliary,
  IFormattedAuxScoreboardTeam,
  IFormattedRoster,
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
  private agentSelectStartTime?: number = undefined;

  public roundNumber: number = 0;
  public roundPhase: string = "LOBBY";
  private roundTimeoutTime?: number = undefined;
  private wasTimeout: boolean = false;
  private spikeDetonationTime?: number = undefined;

  private teams: Team[] = [];
  private map: string = "Loading";
  private spikeState: SpikeStates = { planted: false, detonated: false, defused: false };
  private attackersWon: boolean = false;
  private showAliveKDA: boolean = false;

  private timeoutState: TimeoutStates = {
    techPause: false,
    leftTeam: false,
    rightTeam: false,
    timeRemaining: 0,
  };
  private timeoutEndTimeout: any = undefined;
  private timeoutRemainingLoop: any = undefined;
  
  private leftTimeoutCancellationTimer: any = undefined;
  private rightTimeoutCancellationTimer: any = undefined;
  private hasEnteredOvertime: boolean = false;

  private tools: ToolsData;

  // private ranks: { team1: string[]; team2: string[] } = { team1: [], team2: [] };

  private replayLog: ReplayLogging;
  public eventNumber: number = 1;
  public organizationId: string = "";
  public isRegistered: boolean = false;

  constructor(data: IAuthenticationData) {
    this.groupCode = data.groupCode;

    this.replayLog = new ReplayLogging(data);

    this.tools = new ToolsData(data.toolsData);

    const firstTeam = new Team(data.leftTeam, this.tools.playercamsInfo.removeTricodes);
    const secondTeam = new Team(data.rightTeam, this.tools.playercamsInfo.removeTricodes);

    this.teams.push(firstTeam);
    this.teams.push(secondTeam);

    // Add Spectra logo to sponsors if enabled and not a supporter
    if (this.tools.sponsorInfo.enabled && !data.isSupporter) {
      this.tools.sponsorInfo.sponsors.push("https://auto.valospectra.com/assets/misc/logo.webp");
    }

    // !!! Disabling the watermark/setting a custom text without Spectra Plus is against the License terms and strictly forbidden !!!
    // Set Watermark info according to settings and supporter role
    this.tools.watermarkInfo.spectraWatermark =
      this.tools.watermarkInfo.spectraWatermark || !data.isSupporter;
    // Deactivate custom text if not a supporter
    this.tools.watermarkInfo.customTextEnabled =
      this.tools.watermarkInfo.customTextEnabled && !!data.isSupporter;

    if (process.env.USE_BACKEND === "true") {
      this.organizationId = data.organizationId || "";
      this.updateNameOverridesAndPlayercams().then(() => {});
    }
  }

  async receiveMatchSpecificData(data: IAuthedData | IAuthedAuxData) {
    this.replayLog.write(data);

    let correctTeam = null;
    switch (data.type) {
      case DataTypes.SCOREBOARD:
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

        this.processSpikePlantDetection(data, correctTeam);
        correctTeam.receiveTeamSpecificData(data);
        break;

      case DataTypes.ROSTER:
        correctTeam = this.teams.find(
          (team) => team.ingameTeamId == (data.data as IFormattedRoster).startTeam,
        );

        if (correctTeam == null) {
          Log.error(
            `Received match data with invalid team for group code "${(data as IAuthedData).groupCode}"`,
          );
          Log.debug(`Data: ${JSON.stringify(data)}`);
          return;
        }

        if (this.agentSelectStartTime == undefined) {
          this.agentSelectStartTime = data.timestamp;
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
        correctTeam = this.teams.find(
          (team) => team.ingameTeamId == (data.data as IFormattedScoreboard).startTeam,
        );
        if (correctTeam) {
          this.processSpikePlantDetection(data, correctTeam);
          correctTeam.receiveTeamSpecificData(data);
        }
        break;

      case DataTypes.AUX_ABILITIES:
      case DataTypes.AUX_HEALTH:
      case DataTypes.AUX_ASTRA_TARGETING:
      case DataTypes.AUX_CYPHER_CAM:
        this.teams.forEach((team) => team.receiveTeamSpecificData(data));
        break;

      case DataTypes.AUX_SCOREBOARD_TEAM:
        correctTeam = this.teams[0].hasTeamMemberById((data.data as IFormattedAuxiliary).playerId)
          ? this.teams[0]
          : this.teams[1];

        if (correctTeam) {
          const scoreboards = JSON.parse(data.data as string) as IFormattedAuxScoreboardTeam[];
          for (const scoreboardData of scoreboards) {
            this.processSpikePlantDetectionTeam(scoreboardData, correctTeam, data.timestamp);
          }
          correctTeam.receiveAuxScoreboardTeamData(scoreboards);
        }
        break;

      case DataTypes.SPIKE_PLANTED:
        this._setSpikePlanted(data.timestamp);
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

            this.checkAndGrantOvertimeTimeout();

            if (process.env.USE_BACKEND === "true") {
              this.updateNameOverridesAndPlayercams().then(() => {});
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
            
            // Clean up all timeout-related timers
            clearTimeout(this.leftTimeoutCancellationTimer);
            clearTimeout(this.rightTimeoutCancellationTimer);
            this.leftTimeoutCancellationTimer = undefined;
            this.rightTimeoutCancellationTimer = undefined;
            
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
        if (!this.map) {
          //fallback to newest map when incomind data doesn't match any known
          this.map = Maps["Rook"];
        }
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
          
          // Clean up cancellation timers
          clearTimeout(this.leftTimeoutCancellationTimer);
          clearTimeout(this.rightTimeoutCancellationTimer);
          this.leftTimeoutCancellationTimer = undefined;
          this.rightTimeoutCancellationTimer = undefined;
        }
        break;

      case DataTypes.LEFT_TIMEOUT:
        this.handleTeamTimeout("left");
        break;

      case DataTypes.RIGHT_TIMEOUT:
        this.handleTeamTimeout("right");
        break;

      case DataTypes.SWITCH_KDA_CREDITS:
        this.showAliveKDA = !this.showAliveKDA;
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

  private processSpikePlantDetection(data: IAuthedData | IAuthedAuxData, team: Team) {
    if (this.roundPhase !== "combat") return;
    const scoreboardData = data.data as IFormattedScoreboard;
    const newMoney = scoreboardData.money;
    const oldMoney = team.getMoneyFor(scoreboardData.playerId);

    // Received 300 money during round, spike must have been planted
    if (newMoney > oldMoney && newMoney - oldMoney === 300) {
      this._setSpikePlanted(data.timestamp);
    }
  }

  private processSpikePlantDetectionTeam(
    data: IFormattedAuxScoreboardTeam,
    team: Team,
    timestamp: number,
  ) {
    if (this.roundPhase !== "combat") return;
    const scoreboardData = data as IFormattedScoreboard;
    const newMoney = scoreboardData.money;
    const oldMoney = team.getMoneyFor(scoreboardData.playerId);

    // Received 300 money during round, spike must have been planted
    if (newMoney > oldMoney && newMoney - oldMoney === 300) {
      this._setSpikePlanted(timestamp);
    }
  }

  private _setSpikePlanted(timestamp: number) {
    if (this.spikeState.planted) return;
    if (this.roundPhase !== "combat") return;
    this.spikeState.planted = true;
    this.roundTimeoutTime = undefined;
    this.spikeDetonationTime = timestamp + 45 * 1000; // Add 45 seconds to the current time
  }

  private handleTeamTimeout(team: "left" | "right") {
    const isLeftTeam = team === "left";
    const currentState = isLeftTeam ? this.timeoutState.leftTeam : this.timeoutState.rightTeam;
    const cancellationTimer = isLeftTeam ? this.leftTimeoutCancellationTimer : this.rightTimeoutCancellationTimer;
    
    if (cancellationTimer) {
      clearTimeout(cancellationTimer);
      if (isLeftTeam) {
        this.leftTimeoutCancellationTimer = undefined;
      } else {
        this.rightTimeoutCancellationTimer = undefined;
      }
      
      // Stop the current timeout
      this.timeoutState.leftTeam = false;
      this.timeoutState.rightTeam = false;
      clearTimeout(this.timeoutEndTimeout);
      clearInterval(this.timeoutRemainingLoop);
      this.timeoutEndTimeout = undefined;
      this.timeoutRemainingLoop = undefined;
      
      return;
    }

    if (currentState) {
      this.timeoutState.leftTeam = false;
      this.timeoutState.rightTeam = false;
      clearTimeout(this.timeoutEndTimeout);
      clearInterval(this.timeoutRemainingLoop);
      this.timeoutEndTimeout = undefined;
      this.timeoutRemainingLoop = undefined;
    } else {
      const timeoutsRemaining = isLeftTeam ? this.tools.timeoutCounter.left : this.tools.timeoutCounter.right;
      
      if (timeoutsRemaining <= 0) {
        return;
      }
      
      this.timeoutState.leftTeam = isLeftTeam;
      this.timeoutState.rightTeam = !isLeftTeam;
      this.timeoutState.techPause = false;
      this.timeoutState.timeRemaining = this.tools.timeoutDuration;
      this.startTimeoutEndTimeout();
      
      const gracePeriodTimer = setTimeout(() => {
        if (isLeftTeam) {
          this.tools.timeoutCounter.left = Math.max(0, this.tools.timeoutCounter.left - 1);
          this.leftTimeoutCancellationTimer = undefined;
        } else {
          this.tools.timeoutCounter.right = Math.max(0, this.tools.timeoutCounter.right - 1);
          this.rightTimeoutCancellationTimer = undefined;
        }
        this.eventNumber++;
      }, this.tools.timeoutCancellationGracePeriod * 1000);
      
      if (isLeftTeam) {
        this.leftTimeoutCancellationTimer = gracePeriodTimer;
      } else {
        this.rightTimeoutCancellationTimer = gracePeriodTimer;
      }
    }
  }

  private checkAndGrantOvertimeTimeout() {
    if (this.roundNumber >= this.firstOtRound && !this.hasEnteredOvertime) {
      this.hasEnteredOvertime = true;
      
      this.tools.timeoutCounter.left = Math.min(2, this.tools.timeoutCounter.left + 1);
      this.tools.timeoutCounter.right = Math.min(2, this.tools.timeoutCounter.right + 1);
      
      this.eventNumber++;
      Log.info(`Overtime reached! Each team granted an additional timeout.`);
    }
  }

  private async updateNameOverridesAndPlayercams() {
    if (
      !this.tools.playercamsInfo.identifier ||
      this.tools.playercamsInfo.identifier == "" ||
      !this.tools.playercamsInfo.secret ||
      this.tools.playercamsInfo.secret == ""
    )
      return;

    const data = await DatabaseConnector.getNameOverridesAndPlayercams(
      this.tools.playercamsInfo.identifier,
      this.tools.playercamsInfo.secret,
    );
    if (!data) return;

    this.tools.playercamsInfo.enabledPlayers = data.enabledPlayers;
    this.tools.nameOverrides.overrides = data.nameOverrides;

    this.eventNumber++;
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
