import { Player } from "./Player";
import { DataTypes, IAuthedData, IFormattedKillfeed, IFormattedRoster, IFormattedScore, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
const Log = logging("Team");

export class Team {
    public teamName;
    public isAttacking: boolean = false;
    public roundsWon: number = 0;

    private players: Player[] = [];
    private playerCount = 0;

    constructor(teamName: string) {
        this.teamName = teamName.toUpperCase();
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
                this.isAttacking = data.data as boolean;

            case DataTypes.SCORE:
                this.roundsWon = (data.data as IFormattedScore).won;
                break;

            default:
                break;
        }
    }

    private processRosterData(data: IFormattedRoster) {
        if (data.agentInternal == "") {
            if (this.playerCount < 5) {
                this.players.push(new Player(data));
                this.playerCount++;
            }
        } else {
            for (const player of this.players) {
                if (player.playerId === data.playerId) {
                    player.onRosterUpdate(data);
                    break;
                }
            }
        }
    }

    private processScoreboardData(data: IFormattedScoreboard) {
        for (const player of Object.values(this.players)) {
            if (player.name === data.name) {
                player.updateFromScoreboard(data);
                return;
            }
        }
    }

    private processKillfeedData(data: IFormattedKillfeed) {
        for (const player of Object.values(this.players)) {
            if (player.name === data.attacker) {
                player.extractKillfeedInfo(data);
                return;
            }
        }
    }
}
