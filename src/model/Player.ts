import { Agents, WeaponsAndAbilities } from "../util/valorantInternalTranslator";
import { IFormattedKillfeed, IFormattedRoster, IFormattedScoreboard } from "./eventData";
import logging from "../util/Logging";
const Log = logging("Player");

type ValueOf<T> = T[keyof T];

export class Player {
    private name: string;
    private tagline: string;
    private playerId: string;
    private searchName: string;
    
    private position: number;
    private locked: boolean = false;
    private agentInternal: string = "";
    private agentProper: ValueOf<Agents> = "";

    private isAlive: boolean = true;
    private hasSpike: boolean = false;
    private isObserved: boolean = false;

    private kills: number = 0;
    private deaths: number = 0;
    private assists: number = 0;
    private kdRatio: number = 0;
    private killsThisRound: number = 0;

    private currUltPoints: number = 0;
    private maxUltPoints: number = 10;
    private ultReady: boolean = false;
    
    private money: number = 0;
    private moneySpent: number = 0;
    private spentMoneyThisRound: boolean = false;

    private initialShield: number = 0;
    private highestWeapon: ValueOf<WeaponsAndAbilities> = WeaponsAndAbilities["knife"];

    // Data extrapolated from Killfeed
    private teamKills: number = 0;
    private headshotKills: number = 0;
    private headshotRatio: number = 0;

    private killsByWeaponsAndAbilities: Record<string, number> = {};
    private killsOnEnemyPlayer: Record<string, number> = {};
    private killsOnTeammatePlayer: Record<string, number> = {};
    private assistsFromTeammate: Record<string, number> = {};

    constructor (data: IFormattedRoster) {
        this.name = data.name;
        this.tagline = data.tagline;
        this.playerId = data.playerId;
        this.searchName = `${data.name} #${data.tagline}`;
        this.position = data.position;
        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];
        this.locked = data.locked;
    }

    public onRosterUpdate(data: IFormattedRoster) {
        this.name = data.name;
        this.tagline = data.tagline;
        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];
        this.locked = data.locked;
    }

    public updateFromScoreboard(data: IFormattedScoreboard) {
        if (data.kills > this.kills) {
            this.killsThisRound++;
        }
        this.kills = data.kills;

        this.deaths = data.deaths;
        this.assists = data.assists;
        this.kdRatio = this.kills / this.deaths;

        this.currUltPoints = data.currUltPoints;
        this.maxUltPoints = data.maxUltPoints;
        this.ultReady = this.currUltPoints >= this.maxUltPoints;

        if (!this.spentMoneyThisRound && data.money < this.money) {
            this.spentMoneyThisRound = true;
        }
        if (this.spentMoneyThisRound && data.money != this.money) {
            this.moneySpent += this.money - data.money;
        }
        this.money = data.money;

        this.initialShield = Math.min(Math.max(data.initialShield * 25, 0), 50);
        this.highestWeapon = WeaponsAndAbilities[data.scoreboardWeaponInternal]

        this.agentInternal = data.agentInternal;
        this.agentProper = Agents[data.agentInternal];

        this.isAlive = data.isAlive;
        this.hasSpike = data.hasSpike;
    }

    public extractKillfeedInfo(data: IFormattedKillfeed) {

        // Store kills by weapon/ability
        let existing: number = this.killsByWeaponsAndAbilities[data.weaponKillfeedInternal];
        if (existing) {
            this.killsByWeaponsAndAbilities[data.weaponKillfeedInternal] = existing++;
        } else {
            this.killsByWeaponsAndAbilities[data.weaponKillfeedInternal] = 1;
        }

        // Store headshot data
        if (data.headshotKill == true) {
            this.headshotKills++;
            this.headshotRatio = this.headshotKills / this.kills;
        }

        // Store teamkill data
        if (data.isTeamkill == true) {
            this.teamKills++;
            let existing: number = this.killsOnTeammatePlayer[data.victim];
            if (existing) {
                this.killsOnTeammatePlayer[data.victim] = existing++;
            } else {
                this.killsOnTeammatePlayer[data.victim] = 1;
            }
        }

        // Store how often we killed which enemy
        if (data.isTeamkill == false) {
            let existing: number = this.killsOnEnemyPlayer[data.victim];
            if (existing) {
                this.killsOnEnemyPlayer[data.victim] = existing++;
            } else {
                this.killsOnEnemyPlayer[data.victim] = 1;
            }
        }

        // TEMPORARILY COMMENTED OUT, WE ONLY GET THE ASSISTERS AGENT NAME
        // Store how often we got assisted by which teammate
        // if (data.assists.length > 0) {
        //     for (const assister of data.assists) {
        //         let existing: number = this.assistsFromTeammate[assister];
        //         if (existing) {
        //             this.assistsFromTeammate[assister] = existing++;
        //         } else {
        //             this.assistsFromTeammate[assister] = 1;
        //         }
        //     }
        // }

    }

    public processObservedEvent(observedName: string) {
        if (this.searchName === observedName) {
            this.isObserved = true;
        } else {
            this.isObserved = false;
        }
    }

    public resetRoundSpecificValues(isSideSwitch: boolean) {
        this.resetKillsThisRound();
        this.resetMoneyThisRound();

        if (isSideSwitch) {
            this.money = 800;
        }
    }

    public getName(): string {
        return this.name;
    }

    public getSearchName(): string {
        return this.searchName;
    }

    public getPlayerId(): string {
        return this.playerId;
    }

    public checkIsAlive(): boolean {
        return this.isAlive;
    }

    public getMoneySpent(): number {
        return this.moneySpent;
    }

    public getKillsThisRound(): number {
        return this.killsThisRound;
    }

    public resetKillsThisRound(): void {
        this.killsThisRound = 0;
    }

    public resetMoneyThisRound(): void {
        this.moneySpent = 0;
        this.spentMoneyThisRound = false;
    }
}