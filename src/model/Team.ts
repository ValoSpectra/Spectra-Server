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
    public ingameTeamId: number = 0;
    public isAttacking: boolean = false;
    private hasHandledTeam: boolean = false;
    public roundsWon: number = 0;
    private spentThisRound: number = 0;
    private roundRecord: RecordType[] = [];

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

    hasTeamMemberByName(playerName: string): boolean {
        return this.players.some(player => player.name === playerName);
    }

    hasTeamMemberBySearchName(playerSearchName: string): boolean {
        return this.players.some(player => player.searchName === playerSearchName);
    }

    hasTeamMemberById(playerId: string): boolean {
        return this.players.some(player => player.playerId === playerId);
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
        const correctPlayer = this.players.find(player => player.playerId === data.playerId);

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
        const player = this.players.find(player => player.playerId === data.playerId);
        if (!player) return;
        player.updateFromScoreboard(data);
        this.spentThisRound = this.getSpentThisRound();
    }

    private processKillfeedData(data: IFormattedKillfeed) {
        const player = this.players.find(player => player.name === data.attacker);
        if (!player) return;
        player.extractKillfeedInfo(data);
    }

    processRoundEnd(spikeState: SpikeStates, enemyPlayerCount: number) {
        const teamKills = this.teamKills();

        // ATTACKER LOGIC
        if (this.isAttacking) {
            if (spikeState.detonated) {
                this.roundRecord.push("detonated");
                this.roundsWon++;
            } else if (spikeState.defused == false && teamKills >= enemyPlayerCount) {
                this.roundRecord.push("kills");
                this.roundsWon++;
            } else {
                this.roundRecord.push("lost");
            }
            
        // DEFENDER LOGIC
        } else {
            if (spikeState.defused) {
                this.roundRecord.push("defused");
                this.roundsWon++;
            } else if (spikeState.planted == false && teamKills >= enemyPlayerCount) {
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