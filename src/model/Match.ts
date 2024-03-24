import { Team } from "./Team";
import { DataTypes, IAuthedData, IFormattedRoundInfo } from "./eventData";
import logging from "../util/Logging";
const Log = logging("Match");


export class Match {
    public groupCode;
    public isRanked: boolean = false;
    public isRunning: boolean = false;

    public roundNumber: number = 0;
    public roundPhase: string = "";

    private teams: Team[] = [];
    private globalEventsTeamName: string = "";
    private map: string = "";
    private spikePlanted = false;

    constructor(groupCode: string, team1: string, team2: string, isRanked: boolean) {
        this.groupCode = groupCode;

        const firstTeam = new Team(team1.toUpperCase());
        const secondTeam = new Team(team2.toUpperCase());

        this.teams.push(firstTeam);
        this.teams.push(secondTeam);

        this.globalEventsTeamName = team1.toUpperCase();
        this.isRanked = isRanked;
    }

    isValidTeam(teamName: string) {
        for (const team of this.teams) {
            if (team.teamName === teamName.toUpperCase()) return true;
        }
        return false;
    }

    receiveMatchSpecificData(data: IAuthedData) {

        // Check for global events we only want once first
        if (data.teamName.toUpperCase() == this.globalEventsTeamName) {
            if (data.type == DataTypes.MATCH_START) {
                this.isRunning = true;
                return;
            } else if (data.type == DataTypes.ROUND_INFO) {
                this.roundNumber = (data.data as IFormattedRoundInfo).roundNumber;
                this.roundPhase = (data.data as IFormattedRoundInfo).roundPhase;

                if (this.roundPhase == "shopping") {
                    this.spikePlanted = false;
                }

                if ((this.roundNumber == 13 || this.roundNumber >= 25) && this.roundPhase == "shopping") {
                    for (const team of this.teams) {
                        team.isAttacking = !team.isAttacking;
                    }
                }

                return;
            } else if (data.type === DataTypes.MAP) {
                this.map = data.data as string;
                return;
            } else if (data.type === DataTypes.SPIKE_PLANTED) {
                this.spikePlanted = true;
                return;
            }
        }

        let correctTeam = null;
        for (const team of this.teams) {
            if (team.teamName === data.teamName.toUpperCase()) {
                correctTeam = team;
            }
        }

        if (correctTeam == null) {
            Log.info(`Received match data with invalid team "${data.teamName.toUpperCase()}"`);
            return;
        }

        correctTeam.receiveTeamSpecificData(data);
    }

}