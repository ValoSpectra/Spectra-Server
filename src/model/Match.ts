import { Team } from "./Team";
import { IAuthedData } from "./eventData";

export class Match {
    public groupCode;
    public isRanked: boolean = false;

    private teams: Record<string, Team> = {};

    constructor(groupCode: string, team1: string, team2: string, isRanked: boolean) {
        this.groupCode = groupCode;

        const firstTeam = new Team(team1);
        const secondTeam = new Team(team2);

        this.teams["attacker"] = firstTeam;
        this.teams["defender"] = secondTeam;

        this.isRanked = isRanked;
    }

    isValidTeam(teamName: string) {
        for (const team of Object.values(this.teams)) {
            if (team.teamName === teamName) return true;
        }
        return false;
    }

    receiveMatchSpecificData(data: IAuthedData) {
        let correctTeam = null;
        for (const team of Object.values(this.teams)) {
            if (team.teamName === data.teamName) {
                correctTeam = team;
            }
        }

        if (correctTeam == null) {
            console.log(`Received match data with invalid team "${data.teamName}"`);
            return;
        }

        correctTeam.receiveTeamSpecificData(data);
    }

}