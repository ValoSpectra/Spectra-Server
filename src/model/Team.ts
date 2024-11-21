import { Player } from "./Player";
import { DataTypes, IAuthedData, IFormattedKillfeed, IFormattedRoster, IFormattedScore, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
import { AuthTeam } from "../connector/websocketIncoming";
import { SpikeStates } from "./Match";
const Log = logging("Team").level(1);

type RecordType = "detonated" | "defused" | "kills" | "kills" | "timeout" | "lost";

interface RecordEntry {
    type: RecordType;
    wasAttack: boolean;
    round: number;
}

export class Team {
    public teamName: string;
    public teamTricode: string;
    public teamUrl: string = "";
    public ingameTeamId: number = 0;
    public isAttacking: boolean = false;
    private hasHandledTeam: boolean = false;
    public roundsWon: number = 0;
    private spentThisRound: number = 0;
    private roundRecord: RecordEntry[] = [];

    private players: Player[] = [];
    private playerCount = 0;

    constructor(team: AuthTeam) {
        this.teamName = team.name;
        this.teamTricode = team.tricode;
        this.teamUrl = team.url;

        this.isAttacking = team.attackStart;
        this.ingameTeamId = team.attackStart ? 0 : 1;
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

            default:
                break;
        }
    }

    resetRoundSpecificValues(isSideSwitch: boolean) {
        for (const player of this.players) {
            player.resetRoundSpecificValues(isSideSwitch);
        }
    }

    getSpentThisRound(): number {
        let total = 0;
        for (const player of this.players) {
            total += player.getMoneySpent();
        }
        return total;
    }

    hasTeamMemberByName(playerName: string): boolean {
        return this.players.some(player => player.getName() === playerName);
    }

    hasTeamMemberBySearchName(playerSearchName: string): boolean {
        return this.players.some(player => player.getSearchName() === playerSearchName);
    }

    hasTeamMemberById(playerId: string): boolean {
        return this.players.some(player => player.getPlayerId() === playerId);
    }

    getPlayerCount(): number {
        return this.playerCount;
    }

    switchSides() {
        this.isAttacking = !this.isAttacking;
    }

    setObservedPlayer(observedName: string) {
        for (const player of this.players) {
            player.processObservedEvent(observedName);
        }
    }

    private processRosterData(data: IFormattedRoster) {
        if (data.playerId == "" || data.name == "" || data.tagline == "") return;
        const correctPlayer = this.players.find(player => player.getPlayerId() === data.playerId);

        if (correctPlayer) {
            correctPlayer.onRosterUpdate(data);
            return;
        } else if (this.playerCount < 5) {
            this.players.push(new Player(data));
            this.isAttacking = data.startTeam == 0 ? true : false;
            this.playerCount++;
        } else {
            Log.error(`Received roster data for ${data.name} but team ${this.teamName} is full!`);
        }
    }

    private processScoreboardData(data: IFormattedScoreboard) {
        const player = this.players.find(player => player.getPlayerId() === data.playerId);
        if (!player) return;
        player.updateFromScoreboard(data);
        this.spentThisRound = this.getSpentThisRound();
    }

    private processKillfeedData(data: IFormattedKillfeed) {
        const attacker = this.players.find(player => player.getName() === data.attacker);
        if (attacker) {
            attacker.extractKillfeedInfo(data);
            attacker.fallbackKillfeedExtraction(data);
        }

        const victim = this.players.find(player => player.getName() === data.victim);
        if (!victim) return;
        victim.fallbackKillfeedExtraction(data, true);
    }

    private teamKills(): number {
        let count = 0;
        for (const player of this.players) {
            count += player.getKillsThisRound();
        }

        return count;
    }

    private resetTeamKills() {
        for (const player of this.players) {
            player.resetKillsThisRound();
        }
    }

    public alivePlayers(): number {
        if (this.playerCount == 0) return 1;

        let count = 0;
        for (const player of this.players) {
            if (player.checkIsAlive()) {
                count++;
            }
        }
        return count;
    }

    public addRoundReason(reason: RecordType) {
        this.roundRecord.push({
            type: reason,
            wasAttack: this.isAttacking,
            round: this.roundRecord.length + 1
        });
    }

}