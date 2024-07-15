import { Player } from "./Player";
import { DataTypes, IAuthedData, IFormattedKillfeed, IFormattedRoster, IFormattedScore, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
import { AuthTeam } from "../connector/websocketIncoming";
import { SpikeStates } from "./Match";
const Log = logging("Team");

type RecordType = "detonated" | "defused" | "kills" | "timeout" | "lost";

export class Team {
    public teamName: string;
    public teamTricode: string;
    public teamUrl: string = "";
    public isAttacking: boolean = false;
    private hasHandledTeam: boolean = false;
    public roundsWon: number = 0;
    private spentThisRound: number = 0;
    private roundRecord: RecordType[] = [];

    private players: Player[] = [];
    private playerCount = 0;

    constructor(team: AuthTeam, isAttackStart: boolean = false) {
        this.teamName = team.name;
        this.teamTricode = team.tricode;
        this.teamUrl = team.url;
        this.isAttacking = isAttackStart;
    }

    receiveTeamSpecificData(data: IAuthedData) {
        // Route data
        switch (data.type) {
            case DataTypes.ROSTER:
                this.processRosterData(data.data as IFormattedRoster);
                break;

            case DataTypes.SCOREBOARD:
                this.processScoreboardData(data.data as IFormattedScoreboard);
                break;

            case DataTypes.KILLFEED:
                this.processKillfeedData(data.data as IFormattedKillfeed);
                break;

            case DataTypes.TEAM_IS_ATTACKER:
                // if (!this.hasHandledTeam) {
                //     this.isAttacking = data.data as boolean;
                //     this.hasHandledTeam = true;
                // }
                break;

            case DataTypes.SCORE:
                // this.processScoreData(data.data as IFormattedScore);
                break;

            default:
                break;
        }
    }

    resetRoundSpent() {
        for (const player of this.players) {
            player.moneySpent = 0;
            player.spentMoneyThisRound = false;
        }
    }

    getSpentThisRound(): number {
        let total = 0;
        for (const player of this.players) {
            total += player.moneySpent;
        }
        return total;
    }

    hasTeamMember(playerName: string): boolean {
        return this.players.some(player => player.name === playerName);
    }

    switchSides() {
        this.isAttacking = !this.isAttacking;
    }

    private processRosterData(data: IFormattedRoster) {
        if (data.playerId !== "") return;
        const correctPlayer = this.players.find(player => player.playerId === data.playerId);
        
        if (correctPlayer) {
            correctPlayer.onRosterUpdate(data);
            return;
        } else if (this.playerCount < 5) {
            this.players.push(new Player(data));
            this.playerCount++;
        } else {
            Log.error(`Received roster data for ${data.name} but team ${this.teamName} is full!`);
        }
    }

    private processScoreboardData(data: IFormattedScoreboard) {
        const player = this.players.find(player => player.name === data.name);
        if (!player) return;
        player.updateFromScoreboard(data);
        this.spentThisRound = this.getSpentThisRound();
    }

    private processKillfeedData(data: IFormattedKillfeed) {
        const player = this.players.find(player => player.name === data.attacker);
        if (!player) return;
        player.extractKillfeedInfo(data);
    }

    processRoundEnd(spikeState: SpikeStates) {
        const teamKills = this.teamKills();

        if (this.isAttacking) {
            if (spikeState.detonated) {
                this.roundRecord.push("detonated");
                this.roundsWon++;
            } else if (teamKills >= 5) {
                this.roundRecord.push("kills");
                this.roundsWon++;
            } else {
                this.roundRecord.push("lost");
            }
        } else {
            if (spikeState.defused) {
                this.roundRecord.push("defused");
                this.roundsWon++;
            } else if (teamKills >= 5) {
                this.roundRecord.push("kills");
                this.roundsWon++;
            } else if (spikeState.detonated == false) {
                this.roundRecord.push("timeout");
                this.roundsWon++;
            } else {
                this.roundRecord.push("lost");
            }
        }

        this.resetTeamKills();

        // SCORE DATA IS CURRENTLY BROKEN, WORKAROUND ABOVE
        // const newWon = data.won;
        // if (newWon == null) return;

        // if (newWon > this.roundsWon) {

        //     const teamKills = this.teamKills();
        //     if (this.spikeState !== "") {
        //         this.roundRecord.push(this.spikeState);
        //     } else if (teamKills >= 5) {
        //         this.roundRecord.push("kills");
        //     } else {
        //         this.roundRecord.push("timeout");
        //     }
        //     this.roundsWon = newWon;

        // } else {
        //     this.roundRecord.push("lost");
        // }

        // this.spikeState = "";
        // this.resetTeamKills();
    }

    private teamKills(): number {
        let count = 0;
        for (const player of this.players) {
            count += player.killsThisRound;
        }

        return count;
    }

    private resetTeamKills() {
        for (const player of this.players) {
            player.killsThisRound = 0;
        }
    }
}