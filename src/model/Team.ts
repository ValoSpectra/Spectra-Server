import { Player } from "./Player";
import { DataTypes, IAuthedData, IFormattedKillfeed, IFormattedRoster, IFormattedScoreboard } from "./eventData";

export class Team {
    public teamName;
    public isAttacking: boolean = true;

    private players: Record<string, Player> = {};
    private playerCount = 0;

    constructor(teamName: string) {
        this.teamName = teamName;
        if (teamName == "TestTeam") {
            this.receiveTeamSpecificData({
                groupCode: "A", teamName: "TestTeam", playerName: "TestName", type: "roster", data: {
                    name: 'Dunkel',
                    tagline: 'Licht',
                    agentInternal: '',
                    locked: false,
                    rank: 0
                }
            });
            this.receiveTeamSpecificData({
                groupCode: "A", teamName: "TestTeam", playerName: "TestName", type: "roster", data: {
                    name: 'Dunkel',
                    tagline: 'Licht',
                    agentInternal: 'Gumshoe',
                    locked: true,
                    rank: 0
                }
            });
        }
    }

    receiveTeamSpecificData(data: IAuthedData) {
        // Route data
        switch (data.type) {
            case DataTypes.ROSTER:
                this.processRosterData(data.data as IFormattedRoster);
                break;

            case DataTypes.SCOREBOARD:

                break;

            case DataTypes.KILLFEED:

                break;
            default:
                break;
        }
    }

    private processRosterData(data: IFormattedRoster) {
        if (this.playerCount < 5) {
            if (data.locked == false && data.agentInternal == "") {
                this.players[data.name] = new Player(data);
                this.playerCount++;
            } else if (data.locked == true) {
                this.players[data.name].onAgentLock(data);
            }
        }
    }

    private processScoreboardData(data: IFormattedScoreboard) {
    }

    private processKillfeedData(data: IFormattedKillfeed) {

    }
}
