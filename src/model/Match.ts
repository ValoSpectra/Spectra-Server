import { Team } from "./Team";
import { DataTypes, IAuthedData, IAUthenticationData, IFormattedKillfeed, IFormattedRoster, IFormattedRoundInfo, IFormattedScore, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
import { ReplayLogging } from "../util/ReplayLogging";
import { Maps } from "../util/valorantInternalTranslator";
import { AuthTeam } from "../connector/websocketIncoming";
import { MatchController } from "../controller/MatchController";
import { DatabaseConnector } from "../connector/databaseConnector";
const Log = logging("Match");


export class Match {
    private matchId: string = "";
    private matchType: "bomb" | "swift" | string = "bomb";
    private switchRound = 13;
    private firstOtRound = 25;

    public backendId: number = -1;    //-1 being not existing in db
    public groupCode;
    public isRunning: boolean = false;

    public roundNumber: number = 0;
    public roundPhase: string = "LOBBY";
    private roundTimeoutTime?: number = undefined;
    private wasTimeout: boolean = false;
    private spikeDetonationTime?: number = undefined;

    private teams: Team[] = [];
    private map: string = "";
    private spikeState: SpikeStates = { planted: false, detonated: false, defused: false };
    private attackersWon: boolean = false;

    private ranks: { team1: string[], team2: string[]; } = { team1: [], team2: [] };

    private replayLog: ReplayLogging;
    public eventNumber: number = 1;

    constructor(data: IAUthenticationData) {
        this.groupCode = data.groupCode;

        this.replayLog = new ReplayLogging(data);

        const firstTeam = new Team(data.leftTeam);
        const secondTeam = new Team(data.rightTeam);

        this.teams.push(firstTeam);
        this.teams.push(secondTeam);
    }

    async receiveMatchSpecificData(data: IAuthedData) {
        this.replayLog.write(data);

        let correctTeam = null;
        switch (data.type) {

            case DataTypes.SCOREBOARD:
            case DataTypes.ROSTER:
                correctTeam = this.teams.find(team => team.ingameTeamId == (data.data as IFormattedScoreboard).startTeam);

                if (correctTeam == null) {
                    Log.error(`Received match data with invalid team for group code "${data.groupCode}"`);
                    Log.debug(`Data: ${JSON.stringify(data)}`);
                    return;
                }

                correctTeam.receiveTeamSpecificData(data);
                break;

            case DataTypes.KILLFEED:
                this.teams.forEach(team => team.receiveTeamSpecificData(data));
                break;

            case DataTypes.OBSERVING:
                for (const team of this.teams) {
                    team.setObservedPlayer(data.data as string);
                }
                break;

            case DataTypes.SPIKE_PLANTED:
                if (this.roundPhase !== "combat") break;
                this.spikeState.planted = true;
                this.roundTimeoutTime = undefined;
                this.spikeDetonationTime = data.timestamp + (45 * 1000); // Add 45 seconds to the current time
                break;

            case DataTypes.SPIKE_DETONATED:
                this.spikeState.detonated = true;
                this.spikeDetonationTime = undefined;
                break;

            case DataTypes.SPIKE_DEFUSED:
                this.spikeState.defused = true;
                break;

            case DataTypes.SCORE:
                this.processScoreCalculation((data.data as IFormattedScore), data.timestamp);
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

                        let isSwitchRound = false;
                        if (this.roundNumber == this.switchRound || this.roundNumber >= this.firstOtRound) {
                            for (const team of this.teams) {
                                team.switchSides();
                            }
                            isSwitchRound = true;
                        }

                        this.teams.forEach(team => team.resetRoundSpecificValues(isSwitchRound));

                        if (this.backendId == -1) break;

                        DatabaseConnector.updateMatch(this.backendId, this);
                        break;

                    case "combat":
                        this.roundTimeoutTime = data.timestamp + (100 * 1000); // Add 100 seconds to the current time
                        break;

                    case "end":
                        this.roundTimeoutTime = undefined;
                        this.spikeDetonationTime = undefined;
                        break;

                    case "game_end":
                        this.isRunning = false;
                        this.eventNumber++;
                        MatchController.getInstance().removeMatch(this.groupCode);

                        if (this.backendId == -1) return;

                        await DatabaseConnector.endMatch(this.backendId, this);
                        return;
                }

                break;

            case DataTypes.MATCH_START:
                this.matchId = data.data as string;
                this.isRunning = true;

                if (this.backendId == -1) break;

                await DatabaseConnector.startMatch(this.backendId);
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

        }

        this.eventNumber++;
    }

    private processScoreCalculation(data: IFormattedScore, eventTimestamp: number) {
        const team0NewScore = data.team_0;
        const team1NewScore = data.team_1;
        const team0 = this.teams.find(team => team.ingameTeamId == 0)!;
        const team1 = this.teams.find(team => team.ingameTeamId == 1)!;

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
        const attackingTeam = this.teams.find(team => team.isAttacking == true)!;
        const defendingTeam = this.teams.find(team => team.isAttacking == false)!;

        if (this.attackersWon) {
            if (this.spikeState.detonated) {
                attackingTeam.addRoundReason("detonated");
            } else {
                attackingTeam.addRoundReason("kills");
            }

            defendingTeam.addRoundReason("lost");

        } else {

            if (this.spikeState.defused) {
                defendingTeam.addRoundReason("defused");
            } else if (this.wasTimeout) {
                defendingTeam.addRoundReason("timeout");
            } else {
                defendingTeam.addRoundReason("kills");
            }

            attackingTeam.addRoundReason("lost");
        }
    }

    private debugLogRoundInfo() {
        Log.debug(`Round ${this.roundNumber} - ${this.roundPhase}`);
        Log.debug(`Round Timeout: ${this.roundTimeoutTime}`);
        Log.debug(`Spike State: ${JSON.stringify(this.spikeState)}`);
        const attackingTeam = this.teams.find(team => team.isAttacking);
        const defendingTeam = this.teams.find(team => !team.isAttacking);
        Log.debug(`Attacking Team: ${attackingTeam?.alivePlayers()} - Defending Team: ${defendingTeam?.alivePlayers()}`);
    }

}

export interface SpikeStates {
    planted: boolean;
    detonated: boolean;
    defused: boolean;
}