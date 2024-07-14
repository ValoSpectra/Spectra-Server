import { Player } from "./Player";
import { DataTypes, IAuthedData, IFormattedKillfeed, IFormattedRoster, IFormattedScore, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
import { AuthTeam } from "../connector/websocketIncoming";
const Log = logging("Team");

export class Team {
    public teamName: string;
    public teamTricode: string;
    public teamUrl: string = "";
    public isAttacking: boolean = false;
    private hasHandledTeam: boolean = false;
    public roundsWon: number = 0;
    private spentThisRound: number = 0;
    private spikeState: "defused" | "detonated" | "" = "";
    private roundRecord: string[] = [];

    private players: Player[] = [];
    private playerCount = 0;

    constructor(team: AuthTeam) {
        this.teamName = team.name;
        this.teamTricode = team.tricode;
        this.teamUrl = team.url;
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
                if (!this.hasHandledTeam) {
                    this.isAttacking = data.data as boolean;
                    this.hasHandledTeam = true;
                }
                break;

            case DataTypes.SCORE:
                this.processScoreData(data.data as IFormattedScore);
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

    spikeDetonated() {
        this.spikeState = "detonated";
    }

    spikeDefused() {
        this.spikeState = "defused";
    }

    hasTeamMember(playerName: string): boolean {
        return this.players.some(player => player.name === playerName);
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
        for (const player of Object.values(this.players)) {
            if (player.name === data.name) {
                player.updateFromScoreboard(data);
                break;
            }
        }
        this.spentThisRound = this.getSpentThisRound();
    }

    private processKillfeedData(data: IFormattedKillfeed) {
        for (const player of Object.values(this.players)) {
            if (player.name === data.attacker) {
                player.extractKillfeedInfo(data);
                return;
            }
        }
    }

    private processScoreData(data: IFormattedScore) {
        const newWon = data.won;
        if (newWon == null) return;

        if (newWon > this.roundsWon) {

            const teamKills = this.teamKills();
            if (this.spikeState !== "") {
                this.roundRecord.push(this.spikeState);
            } else if (teamKills >= 5) {
                this.roundRecord.push("kills");
            } else {
                this.roundRecord.push("timeout");
            }
            this.roundsWon = newWon;

        } else {
            this.roundRecord.push("lost");
        }

        this.spikeState = "";
        this.resetTeamKills();
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
