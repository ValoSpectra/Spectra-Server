import { Team } from "./Team";
import { DataTypes, IAuthedData, IFormattedKillfeed, IFormattedRoster, IFormattedRoundInfo, IFormattedScore, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
import { ReplayLogging } from "../util/ReplayLogging";
import { Maps } from "../util/valorantInternalTranslator";
import { AuthTeam } from "../connector/websocketIncoming";
const Log = logging("Match");


export class Match {
    private switchRound = 13;
    private firstOtRound = 25;

    public groupCode;
    public isRanked: boolean = false;
    public isRunning: boolean = false;

    public roundNumber: number = 0;
    public roundPhase: string = "LOBBY";
    private roundTimeoutTime?: number = undefined;

    private teams: Team[] = [];
    private map: string = "";
    private spikeState: SpikeStates = { planted: false, detonated: false, defused: false };
    private waitingOnKills: boolean = false;

    public ranks: { team1: string[], team2: string[] } = { team1: [], team2: [] };

    private replayLog: ReplayLogging;
    public eventNumber: number = 0;

    constructor(groupCode: string, leftTeam: AuthTeam, rightTeam: AuthTeam, isRanked: boolean = false) {
        this.groupCode = groupCode;

        this.replayLog = new ReplayLogging(this.groupCode);

        const firstTeam = new Team(leftTeam);
        const secondTeam = new Team(rightTeam);

        this.teams.push(firstTeam);
        this.teams.push(secondTeam);

        this.isRanked = isRanked;
    }

    setRanks(data: any) {
        this.ranks = data.ranks;
    }

    receiveMatchSpecificData(data: IAuthedData) {
        this.replayLog.write(data);

        let correctTeam = null;
        if (data.type == DataTypes.MATCH_START) {
            this.isRunning = true;
            this.eventNumber++;
            return;
        } else if (data.type == DataTypes.ROUND_INFO) {
            this.roundNumber = (data.data as IFormattedRoundInfo).roundNumber;
            this.roundPhase = (data.data as IFormattedRoundInfo).roundPhase;

            if (this.roundPhase == "shopping") {
                this.spikeState.planted = false;
                this.spikeState.detonated = false;
                this.spikeState.defused = false;
                this.waitingOnKills = false;

                if (this.roundNumber == this.switchRound || this.roundNumber >= this.firstOtRound) {
                    for (const team of this.teams) {
                        team.switchSides();
                    }
                }
            }

            if (this.roundPhase == "combat") {
                this.roundTimeoutTime = data.timestamp + (100 * 1000); // Add 100 seconds to the current time
            }

            if (this.roundPhase == "end") {
                this.processScoreCalculation(data.timestamp);
                this.roundTimeoutTime = undefined;
            }

            this.eventNumber++;
            return;
        } else if (data.type === DataTypes.MAP) {
            this.map = Maps[data.data as keyof typeof Maps];
            this.eventNumber++;
            return;
        } else if (data.type === DataTypes.SPIKE_PLANTED) {
            this.spikeState.planted = true;
            this.roundTimeoutTime = undefined;
            this.eventNumber++;
            return;
        } else if (data.type === DataTypes.SPIKE_DETONATED) {
            this.spikeState.detonated = true;
            this.eventNumber++;
            
            if (this.waitingOnKills) {
                this.spikeDuringTimeout();
            }

            return;
        } else if (data.type === DataTypes.SPIKE_DEFUSED) {
            this.spikeState.defused = true;
            this.eventNumber++;

            if (this.waitingOnKills) {
                this.spikeDuringTimeout();
            }

            return;
        } else if (data.type === DataTypes.KILLFEED) {
            correctTeam = this.teams.find(team => team.hasTeamMemberByName((data.data as IFormattedKillfeed).attacker));

            if (correctTeam == null) {
                Log.error(`Received match data with invalid team for group code "${data.groupCode}"`);
                Log.debug(`Data: ${JSON.stringify(data)}`);
                return;
            }

            correctTeam.receiveTeamSpecificData(data);
            this.eventNumber++;
            return;
        } else if (data.type === DataTypes.OBSERVING) {
            for (const team of this.teams) {
                team.setObservedPlayer(data.data as string);
            }
        } else if (data.type === DataTypes.TEAM_IS_ATTACKER) {
            return;
        } else if (data.type === DataTypes.SCORE) {
            // Score does not work properly atm, so we ignore it
            return;
        }

        correctTeam = this.teams.find(team => team.ingameTeamId == (data.data as IFormattedScoreboard).startTeam);

        if (correctTeam == null) {
            Log.error(`Received match data with invalid team for group code "${data.groupCode}"`);
            Log.debug(`Data: ${JSON.stringify(data)}`);
            return;
        }

        this.eventNumber++;
        correctTeam.receiveTeamSpecificData(data);

        if (this.waitingOnKills && data.type === DataTypes.SCOREBOARD) {
            this.checkKillStatus();
        }
    }

    private processScoreCalculation(eventTimestamp: number) {
        const attackingTeam = this.teams.find(team => team.isAttacking);
        const defendingTeam = this.teams.find(team => !team.isAttacking);

        if (this.spikeState.planted === true) {
            if (this.spikeState.detonated) {
                attackingTeam?.addRoundReason("detonated");
                defendingTeam?.addRoundReason("lost");
            } else if (this.spikeState.defused) {
                defendingTeam?.addRoundReason("defused");
                attackingTeam?.addRoundReason("lost");
            } else {
                attackingTeam?.addRoundReason("kills");
                defendingTeam?.addRoundReason("lost");
            }
        }

        if (this.spikeState.planted === false) {
            if (attackingTeam?.alivePlayers() == 0) {
                defendingTeam?.addRoundReason("kills");
                attackingTeam?.addRoundReason("lost");
            } else if (defendingTeam?.alivePlayers() == 0) {
                attackingTeam?.addRoundReason("kills");
                defendingTeam?.addRoundReason("lost");
            } else if (this.roundTimeoutTime && eventTimestamp >= this.roundTimeoutTime) {
                defendingTeam?.addRoundReason("timeout");
                attackingTeam?.addRoundReason("lost");
            } else {
                // Has to be a win by kills - but we didn't receive all the data yet
                // Activate the waiting on kills flag to enable checkKillStatus function
                this.waitingOnKills = true;
            }
        }


    }

    private checkKillStatus() {
        const attackingTeam = this.teams.find(team => team.isAttacking);
        const defendingTeam = this.teams.find(team => !team.isAttacking);

        if (attackingTeam?.alivePlayers() == 0) {
            defendingTeam?.addRoundReason("kills");
            attackingTeam?.addRoundReason("lost");
            this.waitingOnKills = false;
        } else if (defendingTeam?.alivePlayers() == 0) {
            attackingTeam?.addRoundReason("kills");
            defendingTeam?.addRoundReason("lost");
            this.waitingOnKills = false;
        }

        // Triggering scoreboard data did not include a death, waiting...
    }

    // This should only ever happen in very rare cases where the spike event is delayed for some reason
    private spikeDuringTimeout() {
        const attackingTeam = this.teams.find(team => team.isAttacking);
        const defendingTeam = this.teams.find(team => !team.isAttacking);

        if (this.spikeState.detonated) {
            attackingTeam?.addRoundReason("detonated");
            defendingTeam?.addRoundReason("lost");
        } else if (this.spikeState.defused) {
            defendingTeam?.addRoundReason("defused");
            attackingTeam?.addRoundReason("lost");
        }

        this.waitingOnKills = false;
    }

}

export interface SpikeStates {
    planted: boolean;
    detonated: boolean;
    defused: boolean;
}